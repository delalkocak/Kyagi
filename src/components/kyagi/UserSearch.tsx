import React, { useState, useEffect, useRef } from "react";
import { colors } from "./data";
import { XIcon } from "./icons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useInviteToCircle } from "@/hooks/use-circle";

interface SearchResult {
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
}

const PASTEL_COLORS = ["#E8D5E0", "#D5E0E8", "#E0E8D5", "#E8E0D5", "#D5D8E8", "#E8D5D5"];
function pastelBg(name: string) {
  return PASTEL_COLORS[name.charCodeAt(0) % PASTEL_COLORS.length];
}

export function UserSearch({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setError("");

      const searchTerm = trimmed.replace(/^@/, "");
      const lowerTerm = `%${searchTerm.toLowerCase()}%`;

      const { data, error: searchError } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .or(`username.ilike.${lowerTerm},display_name.ilike.${lowerTerm}`)
        .neq("user_id", user!.id)
        .limit(10);

      if (searchError) {
        setError("search failed");
      } else {
        setResults(data || []);
      }
      setSearching(false);
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, user]);

  const handleSendRequest = async (targetUserId: string) => {
    setError("");
    setSuccessMsg("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("invite-to-circle", {
        body: { userId: targetUserId },
      });

      if (fnError) {
        // Try to extract message from the response body
        const msg = data?.error || fnError.message || "failed to send request";
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);

      setSentTo((prev) => new Set(prev).add(targetUserId));
      setSuccessMsg(data?.message || "request sent!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setError(err.message || "failed to send request");
    }
  };

  return (
    <div className="rounded-xl border p-4 mb-4 animate-fade-slide-in" style={{ background: colors.card, borderColor: colors.border }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="font-sans text-xs font-semibold" style={{ color: colors.text }}>
          find friends
        </div>
        <button onClick={onClose} className="bg-transparent border-0 cursor-pointer p-1">
          <XIcon size={14} color={colors.textMuted} />
        </button>
      </div>

      {/* Search input */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="search by @username or name"
        maxLength={100}
        className="w-full py-2.5 px-3.5 rounded-lg border font-sans text-[13px] outline-none box-border mb-2"
        style={{ borderColor: colors.border, background: colors.warmGray, color: colors.text }}
      />

      {error && (
        <div className="rounded-lg p-2 mb-2 font-sans text-[11px]" style={{ background: "#A5212A15", color: "#A5212A" }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg p-2 mb-2 font-sans text-[11px]" style={{ background: "#1A7A6D15", color: "#1A7A6D" }}>
          {successMsg}
        </div>
      )}

      {/* Results */}
      {searching && (
        <div className="text-center py-3">
          <div className="font-sans text-[11px]" style={{ color: colors.textMuted }}>searching...</div>
        </div>
      )}

      {!searching && query.trim().length >= 2 && results.length === 0 && (
        <div className="text-center py-3">
          <div className="font-sans text-[11px]" style={{ color: colors.textMuted }}>no users found</div>
        </div>
      )}

      {results.map((r) => {
        const initial = r.display_name.charAt(0).toUpperCase();
        const alreadySent = sentTo.has(r.user_id);

        return (
          <div
            key={r.user_id}
            className="flex items-center gap-3 py-2.5 px-1"
            style={{ borderBottom: `0.5px solid ${colors.border}` }}
          >
            {r.avatar_url ? (
              <img src={r.avatar_url} alt={r.display_name} className="w-9 h-9 rounded-full object-cover shrink-0" />
            ) : (
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-sans text-[13px] font-medium shrink-0"
                style={{ background: pastelBg(r.display_name), color: colors.text }}
              >
                {initial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-sans text-[14px] font-medium truncate" style={{ color: colors.text }}>
                {r.display_name}
              </div>
              {r.username && (
                <div className="font-sans text-[11px] truncate" style={{ color: colors.textMuted }}>
                  @{r.username}
                </div>
              )}
            </div>
            <button
              onClick={() => handleSendRequest(r.user_id)}
              disabled={alreadySent}
              className="rounded-lg py-1.5 px-3 border-0 font-sans text-[11px] font-semibold cursor-pointer transition-opacity shrink-0"
              style={{
                background: alreadySent ? colors.warmGray : colors.accent,
                color: alreadySent ? colors.textMuted : "#fff",
              }}
            >
              {alreadySent ? "sent" : "add"}
            </button>
          </div>
        );
      })}

      <div className="font-sans text-[10px] mt-2" style={{ color: colors.textMuted }}>
        search by name or @username to find friends on kyagi
      </div>
    </div>
  );
}
