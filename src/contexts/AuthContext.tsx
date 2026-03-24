import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up listener BEFORE getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setLoading(false);

        // Auto-detect and persist timezone on sign-in
        if ((_event === "SIGNED_IN" || _event === "TOKEN_REFRESHED") && session?.user) {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (tz) {
            supabase
              .from("profiles")
              .update({ timezone: tz } as any)
              .eq("user_id", session.user.id)
              .then(({ error }) => {
                if (error) console.warn("Failed to save timezone:", error);
              });
          }
        }

        // Auto-redeem invite code on first login
        if (_event === "SIGNED_IN" && session?.user) {
          const inviteCode = session.user.user_metadata?.invite_code;
          if (inviteCode) {
            try {
              await supabase.functions.invoke("redeem-invite", {
                body: { code: inviteCode },
              });
              // Clear the invite_code from metadata so we don't redeem again
              await supabase.auth.updateUser({
                data: { invite_code: null },
              });
            } catch (e) {
              console.error("Failed to redeem invite:", e);
            }
          }
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
