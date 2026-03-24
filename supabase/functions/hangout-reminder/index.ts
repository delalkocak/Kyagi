import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Helper to get current hour in a given IANA timezone
function getLocalHour(timezone: string): number {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).formatToParts(now);
    const hourPart = parts.find((p) => p.type === "hour");
    return parseInt(hourPart?.value || "0", 10);
  } catch {
    return new Date().getUTCHours();
  }
}

// Get tomorrow's date in user's timezone
function getTomorrowInTimezone(timezone: string): string {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(tomorrow); // YYYY-MM-DD
  } catch {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }
}

// Cron: runs every 3 hours, sends 24h reminders for confirmed hangouts happening tomorrow
// Only sends when it's roughly 9am in the user's timezone (8-10am window)
// Schedule: 0 */3 * * * (every 3 hours to cover all timezones)
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all confirmed hangouts in the next 2 days (to cover all timezones)
    const today = new Date();
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const todayStr = today.toISOString().split("T")[0];
    const dayAfterStr = dayAfterTomorrow.toISOString().split("T")[0];

    const { data: hangouts, error } = await supabase
      .from("confirmed_hangouts")
      .select("*")
      .gte("hangout_date", todayStr)
      .lte("hangout_date", dayAfterStr);

    if (error) throw error;
    if (!hangouts || hangouts.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Collect all user IDs and get their timezones
    const userIds = new Set<string>();
    hangouts.forEach((h) => {
      userIds.add(h.user_a_id);
      userIds.add(h.user_b_id);
    });

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, timezone")
      .in("user_id", Array.from(userIds));

    const profileMap = new Map(
      (profiles || []).map((p: any) => [p.user_id, p])
    );

    let sent = 0;
    for (const h of hangouts) {
      for (const [userId, otherId] of [
        [h.user_a_id, h.user_b_id],
        [h.user_b_id, h.user_a_id],
      ]) {
        const userProfile = profileMap.get(userId) as any;
        const otherProfile = profileMap.get(otherId) as any;
        const tz = userProfile?.timezone || "America/New_York";

        // Only send if it's around 9am in this user's timezone (8-10 window)
        const localHour = getLocalHour(tz);
        if (localHour < 8 || localHour > 10) continue;

        // Check if tomorrow in user's timezone matches the hangout date
        const tomorrowLocal = getTomorrowInTimezone(tz);
        if (h.hangout_date !== tomorrowLocal) continue;

        const otherName = (otherProfile?.display_name || "your friend").split(" ")[0];

        try {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              userId,
              title: `tomorrow: ${h.activity}`,
              body: `with ${otherName} at ${h.time_block}. see you there.`,
              data: { route: "/schedule" },
              tag: `reminder-${h.id}-${userId}`,
            },
          });
          sent++;
        } catch (e) {
          console.error(`Failed to send reminder to ${userId}:`, e);
        }
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
