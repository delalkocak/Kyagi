import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  const providedSecret = req.headers.get("x-cron-secret") ?? "";
  if (!cronSecret || providedSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseKey);

    // Find users with onboarding_step = 'exploring', 0 non-team circle members,
    // account created > 24h ago, < 48h ago, and no existing onboarding_nudge notification
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: candidates } = await adminClient
      .from("profiles")
      .select("user_id, display_name")
      .eq("onboarding_step", "exploring")
      .eq("is_team_account", false)
      .lt("created_at", cutoff24h)
      .gt("created_at", cutoff48h);

    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    for (const user of candidates) {
      // Check if nudge already sent
      const { data: existing } = await adminClient
        .from("notifications")
        .select("id")
        .eq("user_id", user.user_id)
        .eq("type", "onboarding_nudge")
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Check if they have any non-team friends in their circle
      const { data: circle } = await adminClient
        .from("circles")
        .select("id")
        .eq("owner_id", user.user_id)
        .maybeSingle();

      if (circle) {
        const { data: members } = await adminClient
          .from("circle_members")
          .select("user_id")
          .eq("circle_id", circle.id);

        const memberIds = (members || []).map((m: any) => m.user_id);
        if (memberIds.length > 0) {
          const { data: teamCheck } = await adminClient
            .from("profiles")
            .select("user_id")
            .in("user_id", memberIds)
            .eq("is_team_account", false);

          if (teamCheck && teamCheck.length > 0) continue; // Has real friends, skip
        }
      }

      // Send the nudge
      await adminClient.from("notifications").insert({
        user_id: user.user_id,
        type: "onboarding_nudge",
        title: "your invite link is ready whenever you want to share it.",
      });

      // Also try push notification (use service-role key — required by send-push-notification)
      try {
        await adminClient.functions.invoke("send-push-notification", {
          body: {
            userId: user.user_id,
            title: "kyagi",
            body: "your invite link is ready whenever you want to share it.",
            tag: "onboarding_nudge",
          },
        });
      } catch {}

      sent++;
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
