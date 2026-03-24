import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Weekly priority reminder - scheduled via cron
// Sunday noon: 0 12 * * 0 (UTC)
// Monday 9am:  0 9 * * 1
// Monday 5pm:  0 17 * * 1
// Now timezone-aware: checks each user's local time before sending

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
    return new Date().getUTCHours(); // fallback to UTC
  }
}

function getLocalDay(timezone: string): number {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    }).formatToParts(now);
    const dayPart = parts.find((p) => p.type === "weekday");
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return dayMap[dayPart?.value || ""] ?? new Date().getUTCDay();
  } catch {
    return new Date().getUTCDay();
  }
}

function getLocalWeekStart(timezone: string): string {
  // Get current date in user's timezone, then find Monday of that week
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" });
    const localDateStr = formatter.format(now); // YYYY-MM-DD format
    const localDate = new Date(localDateStr + "T00:00:00");
    const dayOfWeek = localDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? 1 : -(dayOfWeek - 1); // Sunday → next Monday
    if (dayOfWeek === 0) {
      // If Sunday, the upcoming week starts tomorrow
      localDate.setDate(localDate.getDate() + 1);
    } else {
      localDate.setDate(localDate.getDate() - (dayOfWeek - 1));
    }
    return localDate.toISOString().split("T")[0];
  } catch {
    // Fallback
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    if (dayOfWeek === 0) {
      monday.setDate(monday.getDate() + 1);
    } else {
      monday.setDate(monday.getDate() - (dayOfWeek - 1));
    }
    return monday.toISOString().split("T")[0];
  }
}

// Determine which reminder type to send based on user's local time
function getReminderType(timezone: string): { title: string; body: string } | null {
  const localDay = getLocalDay(timezone);
  const localHour = getLocalHour(timezone);

  if (localDay === 0 && localHour >= 11 && localHour <= 13) {
    // Sunday around noon
    return {
      title: "plan your week",
      body: "what activities matter most this week? set your priorities now.",
    };
  } else if (localDay === 1 && localHour >= 8 && localHour <= 10) {
    // Monday morning
    return {
      title: "still time to plan",
      body: "you haven't set your weekly priorities yet.",
    };
  } else if (localDay === 1 && localHour >= 16 && localHour <= 18) {
    // Monday afternoon
    return {
      title: "last chance this week",
      body: "set your priorities before the week gets away from you.",
    };
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all users with profiles (including timezone)
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, timezone");

    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    for (const profile of profiles) {
      const tz = (profile as any).timezone || "America/New_York"; // default to ET
      const reminder = getReminderType(tz);
      if (!reminder) continue; // Not the right time for this user

      // Check if user has already set priorities for their local week
      const weekStart = getLocalWeekStart(tz);
      const { data: existing } = await supabase
        .from("weekly_priorities")
        .select("id")
        .eq("user_id", profile.user_id)
        .eq("week_start", weekStart)
        .limit(1);

      if (existing && existing.length > 0) continue; // Already set

      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            userId: profile.user_id,
            title: reminder.title,
            body: reminder.body,
            data: { route: "/priorities" },
            tag: "priority-reminder",
          },
        });
        sent++;
      } catch (e) {
        console.error(`Failed to notify ${profile.user_id}:`, e);
      }

      // Also insert an in-app notification
      await supabase.from("notifications").insert({
        user_id: profile.user_id,
        type: "priority_reminder",
        title: reminder.title,
        body: reminder.body,
      });
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
