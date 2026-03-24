import React, { useState } from "react";
import { colors } from "./data";
import { avatarColor } from "./FeedScreen";
import { supabase } from "@/integrations/supabase/client";
import { ShareInviteSheet } from "./ShareInviteSheet";
import { UserSearch } from "./UserSearch";
import { toast } from "sonner";

interface ContactMatchScreenProps {
  onClose: () => void;
}

interface MatchedUser {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

export function ContactMatchScreen({ onClose }: ContactMatchScreenProps) {
  const [phase, setPhase] = useState<"intro" | "results" | "no-api" | "denied">("intro");
  const [matches, setMatches] = useState<MatchedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [showInvite, setShowInvite] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const hasContactsApi = "contacts" in navigator && "ContactsManager" in window;

  const handleCheckContacts = async () => {
    if (!hasContactsApi) {
      setPhase("no-api");
      return;
    }

    setLoading(true);
    try {
      const contacts = await (navigator as any).contacts.select(["tel"], { multiple: true });
      if (!contacts || contacts.length === 0) {
        setPhase("denied");
        setLoading(false);
        return;
      }

      // Normalize and hash all phone numbers
      const hashes: string[] = [];
      for (const contact of contacts) {
        for (const tel of contact.tel || []) {
          let normalized = tel.replace(/[\s\-\(\)\.]/g, "");
          if (!normalized.startsWith("+")) normalized = "+1" + normalized;
          const encoder = new TextEncoder();
          const data = encoder.encode(normalized);
          const hashBuffer = await crypto.subtle.digest("SHA-256", data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          hashes.push(hashArray.map(b => b.toString(16).padStart(2, "0")).join(""));
        }
      }

      if (hashes.length === 0) {
        setMatches([]);
        setPhase("results");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("match-contacts", {
        body: { hashes },
      });

      if (error) throw error;
      setMatches(data?.matches || []);
      setPhase("results");
    } catch (err: any) {
      if (err?.name === "SecurityError" || err?.name === "NotAllowedError") {
        setPhase("denied");
      } else {
        setPhase("no-api");
      }
    }
    setLoading(false);
  };

  const handleInviteToCircle = async (userId: string) => {
    try {
      await supabase.functions.invoke("invite-to-circle", {
        body: { userId },
      });
      setSentIds(prev => new Set([...prev, userId]));
    } catch (err: any) {
      toast.error(err?.message || "something went wrong");
    }
  };

  if (showSearch) {
    return (
      <div className="fixed inset-0 z-[80] flex flex-col" style={{ background: "#F4EDD8" }}>
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <button onClick={() => setShowSearch(false)} className="font-sans text-sm bg-transparent border-0 cursor-pointer" style={{ color: "#7A1F2E" }}>← back</button>
        </div>
        <div className="flex-1 overflow-y-auto px-4">
          <UserSearch onClose={() => setShowSearch(false)} />
        </div>
      </div>
    );
  }

  if (showInvite) {
    return <ShareInviteSheet onClose={() => setShowInvite(false)} />;
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center px-6" style={{ background: "#F4EDD8" }}>
      {phase === "intro" && (
        <div className="text-center animate-fade-slide-in">
          {/* Icon */}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(108,106,232,0.12)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6C6AE8" strokeWidth="1.5" strokeLinecap="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>

          <div style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "#2C2E3A" }}>
            see who's already here
          </div>
          <div className="font-sans mt-2 mx-auto" style={{ fontSize: 13, color: "#5A5A6A", maxWidth: 280, lineHeight: 1.5 }}>
            kyagi checks if anyone you know is already on the app. we never store your contacts — we just look for matches and forget the rest.
          </div>

          {hasContactsApi ? (
            <button
              onClick={handleCheckContacts}
              disabled={loading}
              className="w-full border-0 cursor-pointer font-sans font-medium mt-5"
              style={{ maxWidth: 300, background: "#6C6AE8", color: "#fff", fontSize: 15, borderRadius: 14, padding: 14, opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "checking..." : "check my contacts"}
            </button>
          ) : (
            <>
              <div className="font-sans mt-4" style={{ fontSize: 13, color: "#5A5A6A" }}>
                contact matching isn't available in this browser.
              </div>
              <div className="flex gap-2 mt-3 w-full" style={{ maxWidth: 300 }}>
                <button onClick={() => setShowSearch(true)} className="flex-1 border-0 cursor-pointer font-sans font-medium" style={{ background: "#6C6AE8", color: "#fff", fontSize: 13, borderRadius: 12, padding: 12 }}>
                  search by name
                </button>
                <button onClick={() => setShowInvite(true)} className="flex-1 border-0 cursor-pointer font-sans font-medium" style={{ background: "#7A1F2E", color: "#fff", fontSize: 13, borderRadius: 12, padding: 12 }}>
                  share an invite
                </button>
              </div>
            </>
          )}

          <button onClick={onClose} className="bg-transparent border-0 cursor-pointer font-sans text-xs mt-4 block mx-auto" style={{ color: "#8090AC" }}>
            not now
          </button>
        </div>
      )}

      {phase === "results" && (
        <div className="text-center w-full max-w-[320px] animate-fade-slide-in">
          {matches.length > 0 ? (
            <>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 18, color: "#2C2E3A", marginBottom: 16 }}>
                friends already on kyagi
              </div>
              <div className="space-y-2 mb-4">
                {matches.map(m => (
                  <div key={m.user_id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#FEFCF6" }}>
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold" style={{ background: avatarColor(m.user_id) }}>
                        {(m.display_name || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <div className="font-sans text-sm font-medium" style={{ color: "#2C2E3A" }}>{m.display_name}</div>
                      <div className="font-sans text-[11px]" style={{ color: "#8090AC" }}>already on kyagi</div>
                    </div>
                    {sentIds.has(m.user_id) ? (
                      <span className="font-sans text-[11px] px-3 py-1.5 rounded-lg" style={{ background: "#F4EDD8", color: "#8090AC" }}>sent</span>
                    ) : (
                      <button onClick={() => handleInviteToCircle(m.user_id)} className="font-sans text-[11px] px-3 py-1.5 rounded-lg border-0 cursor-pointer font-medium" style={{ background: "#6C6AE8", color: "#fff" }}>
                        invite to circle
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => setShowInvite(true)} className="bg-transparent border-0 cursor-pointer font-sans text-[13px]" style={{ color: "#8090AC" }}>
                don't see someone? share an invite link.
              </button>
            </>
          ) : (
            <>
              <div className="font-sans text-sm mb-4" style={{ color: "#5A5A6A" }}>
                none of your contacts are on kyagi yet.
              </div>
              <button onClick={() => setShowInvite(true)} className="border-0 cursor-pointer font-sans font-medium" style={{ background: "#7A1F2E", color: "#fff", fontSize: 14, borderRadius: 12, padding: "12px 24px" }}>
                invite them
              </button>
            </>
          )}
          <button onClick={onClose} className="bg-transparent border-0 cursor-pointer font-sans text-xs mt-4 block mx-auto" style={{ color: "#8090AC" }}>
            done
          </button>
        </div>
      )}

      {phase === "denied" && (
        <div className="text-center animate-fade-slide-in">
          <div className="font-sans text-sm mb-4" style={{ color: "#5A5A6A" }}>
            no worries. you can always find friends by name or share an invite link.
          </div>
          <div className="flex gap-2 w-full" style={{ maxWidth: 300 }}>
            <button onClick={() => setShowSearch(true)} className="flex-1 border-0 cursor-pointer font-sans font-medium" style={{ background: "#6C6AE8", color: "#fff", fontSize: 13, borderRadius: 12, padding: 12 }}>
              search by name
            </button>
            <button onClick={() => setShowInvite(true)} className="flex-1 border-0 cursor-pointer font-sans font-medium" style={{ background: "#7A1F2E", color: "#fff", fontSize: 13, borderRadius: 12, padding: 12 }}>
              share an invite
            </button>
          </div>
          <button onClick={onClose} className="bg-transparent border-0 cursor-pointer font-sans text-xs mt-4 block mx-auto" style={{ color: "#8090AC" }}>
            done
          </button>
        </div>
      )}
    </div>
  );
}
