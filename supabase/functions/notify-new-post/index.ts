import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Called via database webhook on posts INSERT
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { record } = await req.json();
    if (!record) {
      return new Response(JSON.stringify({ error: "no record" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const posterId = record.user_id;
    const postContent = record.content || "";
    const postId = record.id;

    // Get poster's display name
    const { data: posterProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", posterId)
      .single();

    const firstName = (posterProfile?.display_name || "someone").split(" ")[0];

    // Get village members (circle members + circle owners)
    // Users who have the poster in their circle OR whose circle the poster is in
    const { data: circleMembers } = await supabase
      .from("circle_members")
      .select("circle_id, user_id, circles!inner(owner_id)")
      .or(`user_id.eq.${posterId}`);

    const { data: ownedCircles } = await supabase
      .from("circles")
      .select("id, owner_id")
      .eq("owner_id", posterId);

    const { data: memberOfPosterCircle } = await supabase
      .from("circle_members")
      .select("user_id")
      .in("circle_id", (ownedCircles || []).map((c) => c.id));

    // Collect all unique user IDs to notify (excluding poster)
    const notifyUserIds = new Set<string>();

    // People whose circles the poster is a member of (circle owners)
    if (circleMembers) {
      for (const cm of circleMembers) {
        const ownerId = (cm as any).circles?.owner_id;
        if (ownerId && ownerId !== posterId) notifyUserIds.add(ownerId);
      }
    }

    // People who are members of the poster's circle
    if (memberOfPosterCircle) {
      for (const m of memberOfPosterCircle) {
        if (m.user_id !== posterId) notifyUserIds.add(m.user_id);
      }
    }

    if (notifyUserIds.size === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body =
      postContent.length > 80
        ? postContent.substring(0, 77) + "..."
        : postContent || "tap to see what's new.";

    // Send push to each user
    let sent = 0;
    for (const userId of notifyUserIds) {
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            userId,
            title: `${firstName} shared some highlights`,
            body,
            data: { route: "/feed", postId },
            tag: `post-${postId}`,
          },
        });
        sent++;
      } catch (e) {
        console.error(`Failed to notify ${userId}:`, e);
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
