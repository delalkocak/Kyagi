import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { LinkPreviewData } from "@/components/kyagi/LinkPreviewCard";

const URL_REGEX = /(?:https?:\/\/|www\.)\S+/i;
const DEBOUNCE_MS = 800;

function normalizeUrl(url: string): string {
  if (url.startsWith("www.")) return "https://" + url;
  return url;
}

export function useLinkPreview() {
  const [linkData, setLinkData] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef<Map<string, LinkPreviewData>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastFetchedUrlRef = useRef<string | null>(null);

  const fetchPreview = useCallback(async (rawUrl: string) => {
    const url = normalizeUrl(rawUrl);

    // Check cache
    const cached = cacheRef.current.get(url);
    if (cached) {
      setLinkData(cached);
      setLoading(false);
      lastFetchedUrlRef.current = url;
      return;
    }

    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("fetch-link-preview", {
        body: { url },
      });

      if (controller.signal.aborted) return;

      if (error) {
        setLoading(false);
        return;
      }

      const preview: LinkPreviewData = {
        url: data.url || url,
        title: data.title || null,
        description: data.description || null,
        image_url: data.image_url || null,
        site_name: data.site_name || null,
      };

      cacheRef.current.set(url, preview);
      setLinkData(preview);
      lastFetchedUrlRef.current = url;
    } catch {
      // silently fail
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const detectAndFetch = useCallback(
    (text: string, hasMedia: boolean) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (hasMedia) return; // media takes priority

      const match = text.match(URL_REGEX);
      if (!match) return;

      const rawUrl = match[0];
      const url = normalizeUrl(rawUrl);

      // Already fetched this URL
      if (lastFetchedUrlRef.current === url && linkData) return;

      debounceRef.current = setTimeout(() => {
        fetchPreview(rawUrl);
      }, DEBOUNCE_MS);
    },
    [fetchPreview, linkData]
  );

  const clearLink = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    setLinkData(null);
    setLoading(false);
    lastFetchedUrlRef.current = null;
  }, []);

  const resetCache = useCallback(() => {
    cacheRef.current.clear();
    clearLink();
  }, [clearLink]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  return {
    linkData,
    loading,
    detectAndFetch,
    clearLink,
    resetCache,
  };
}

/** Remove the first URL from text and clean up double spaces */
export function removeUrlFromText(text: string): string {
  const match = text.match(URL_REGEX);
  if (!match) return text;
  return text.replace(match[0], "").replace(/  +/g, " ").trim();
}
