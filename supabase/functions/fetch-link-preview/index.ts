import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractDomain(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const parts = hostname.split(".");
    if (parts.length <= 2) return hostname;
    // Handle TLDs like co.uk, co.jp, com.au
    const secondLast = parts[parts.length - 2];
    const commonSecondLevel = ["co", "com", "org", "net", "gov", "ac", "edu"];
    if (commonSecondLevel.includes(secondLast) && parts.length >= 3) {
      return parts.slice(-3).join(".");
    }
    return parts.slice(-2).join(".");
  } catch {
    return null;
  }
}

function fallback(url: string) {
  return {
    title: null,
    description: null,
    image_url: null,
    site_name: extractDomain(url),
    url,
  };
}

function getMetaContent(html: string, property: string): string | null {
  // Match both property="og:..." and name="og:..."
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*?)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*?)["'][^>]+(?:property|name)=["']${property}["']`,
      "i"
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

function getHtmlTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify caller is an authenticated user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify(fallback("")), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify(fallback("")), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify(fallback(url ?? "")), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let response: Response;
    let redirectCount = 0;
    let currentUrl = url;

    try {
      // Manual redirect following (max 3)
      while (true) {
        response = await fetch(currentUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; KyagiBot/1.0)",
            Accept: "text/html",
          },
          redirect: "manual",
        });

        if (
          [301, 302, 303, 307, 308].includes(response.status) &&
          response.headers.get("location")
        ) {
          redirectCount++;
          if (redirectCount > 3) {
            clearTimeout(timeout);
            return new Response(JSON.stringify(fallback(url)), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          const loc = response.headers.get("location")!;
          currentUrl = loc.startsWith("http")
            ? loc
            : new URL(loc, currentUrl).href;
          // Consume the body to avoid leaks
          await response.text();
          continue;
        }
        break;
      }
    } catch {
      clearTimeout(timeout);
      return new Response(JSON.stringify(fallback(url)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    clearTimeout(timeout);

    if (!response!.ok) {
      await response!.text();
      return new Response(JSON.stringify(fallback(url)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read only first 50KB
    const reader = response!.body?.getReader();
    let html = "";
    const decoder = new TextDecoder();
    const MAX_BYTES = 50 * 1024;
    let totalBytes = 0;

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        html += decoder.decode(value, { stream: true });
        if (totalBytes >= MAX_BYTES) {
          reader.cancel();
          break;
        }
      }
    }

    const title = getMetaContent(html, "og:title") ?? getHtmlTitle(html);
    const description = getMetaContent(html, "og:description");
    let imageUrl = getMetaContent(html, "og:image");
    const siteName =
      getMetaContent(html, "og:site_name") ?? extractDomain(url);

    // Make relative image URLs absolute
    if (imageUrl && imageUrl.startsWith("/")) {
      try {
        const origin = new URL(url).origin;
        imageUrl = origin + imageUrl;
      } catch {
        // leave as-is
      }
    }

    return new Response(
      JSON.stringify({
        title: title || null,
        description: description || null,
        image_url: imageUrl || null,
        site_name: siteName || null,
        url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    // Ultimate fallback — never throw
    return new Response(
      JSON.stringify({
        title: null,
        description: null,
        image_url: null,
        site_name: null,
        url: null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
