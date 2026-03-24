import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const syncSecret = Deno.env.get("SYNC_API_SECRET");

    if (!syncSecret) {
      throw new Error("SYNC_API_SECRET not configured");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get all profiles
    const { data: profiles, error: profilesErr } = await supabase
      .from("profiles")
      .select("id, user_id, display_name, created_at, updated_at, age, gender, city, location_type, referral_source, social_media_usage");

    if (profilesErr) throw profilesErr;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No users to sync" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get emails from auth.users via admin API
    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map<string, string>();
    (authData?.users || []).forEach((u: any) => {
      emailMap.set(u.id, u.email || "");
    });

    const userIds = profiles.map((p: any) => p.user_id);

    // Aggregate posts in last 7 days per user
    const { data: recentPosts } = await supabase
      .from("posts")
      .select("user_id")
      .in("user_id", userIds)
      .gte("created_at", sevenDaysAgo);

    const postsPerWeek = new Map<string, number>();
    (recentPosts || []).forEach((p: any) => {
      postsPerWeek.set(p.user_id, (postsPerWeek.get(p.user_id) || 0) + 1);
    });

    // Aggregate comments in last 7 days per user
    const { data: recentComments } = await supabase
      .from("comments")
      .select("user_id")
      .in("user_id", userIds)
      .gte("created_at", sevenDaysAgo);

    const commentsPerWeek = new Map<string, number>();
    (recentComments || []).forEach((c: any) => {
      commentsPerWeek.set(c.user_id, (commentsPerWeek.get(c.user_id) || 0) + 1);
    });

    // Aggregate confirmed hangouts per user (as user_a or user_b)
    const { data: hangoutsA } = await supabase
      .from("confirmed_hangouts")
      .select("user_a_id")
      .in("user_a_id", userIds);

    const { data: hangoutsB } = await supabase
      .from("confirmed_hangouts")
      .select("user_b_id")
      .in("user_b_id", userIds);

    const irlPlans = new Map<string, number>();
    (hangoutsA || []).forEach((h: any) => {
      irlPlans.set(h.user_a_id, (irlPlans.get(h.user_a_id) || 0) + 1);
    });
    (hangoutsB || []).forEach((h: any) => {
      irlPlans.set(h.user_b_id, (irlPlans.get(h.user_b_id) || 0) + 1);
    });

    // Circle members count per user (as circle owner)
    const { data: circles } = await supabase
      .from("circles")
      .select("id, owner_id")
      .in("owner_id", userIds);

    const circleIdToOwner = new Map<string, string>();
    (circles || []).forEach((c: any) => {
      circleIdToOwner.set(c.id, c.owner_id);
    });

    const innerCircleSize = new Map<string, number>();
    if (circles && circles.length > 0) {
      const circleIds = circles.map((c: any) => c.id);
      const { data: members } = await supabase
        .from("circle_members")
        .select("circle_id")
        .in("circle_id", circleIds)
        .eq("is_active", true);

      (members || []).forEach((m: any) => {
        const ownerId = circleIdToOwner.get(m.circle_id);
        if (ownerId) {
          innerCircleSize.set(ownerId, (innerCircleSize.get(ownerId) || 0) + 1);
        }
      });
    }

    // Build user objects
    const users = profiles.map((profile: any) => {
      const uid = profile.user_id;
      return {
        name: profile.display_name || null,
        email: emailMap.get(uid) || null,
        age: profile.age || null,
        gender: profile.gender || null,
        city: profile.city || null,
        location_type: profile.location_type || null,
        referral_source: profile.referral_source || null,
        social_media_usage: profile.social_media_usage || null,
        date_joined: profile.created_at,
        posts_per_week: postsPerWeek.get(uid) || 0,
        comments_per_week: commentsPerWeek.get(uid) || 0,
        irl_plans_made: irlPlans.get(uid) || 0,
        session_length_avg: null,
        last_active_date: profile.updated_at,
        inner_circle_size: innerCircleSize.get(uid) || 0,
        most_used_feature: null,
        status: null,
      };
    });

    // POST to dashboard
    const response = await fetch(
      "https://tjfldrihdjsbqjzhmfpx.supabase.co/functions/v1/receive-sync",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-sync-secret": syncSecret,
        },
        body: JSON.stringify({ users }),
      }
    );

    const result = await response.text();

    return new Response(
      JSON.stringify({
        message: `Synced ${users.length} users`,
        dashboard_status: response.status,
        dashboard_response: result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sync-to-dashboard error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
