import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NUDGE_SUGGESTIONS = [
  "FaceTime a friend while folding laundry.",
  "Cook a meal and share a photo of the process, not just the plate.",
  "Take a walk with no destination in mind.",
  "Ask a stranger how their day is going.",
  "Send a voice note to someone you haven't talked to in a while.",
  "Read a chapter of a book in a public place.",
  "Invite a friend to do nothing together.",
  "Notice three things on your commute you've never noticed before.",
  "Write down one thing you're looking forward to this month.",
  "Try a new coffee shop and bring someone with you.",
  "Sit somewhere outside for 10 minutes without your phone.",
  "Text a friend a genuine compliment, out of nowhere.",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Calculate the previous month's date range
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // last day of current month

    // For the paper, we look at last month's data
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const weekStart = monthStart.toISOString().split("T")[0]; // used as the paper's period identifier
    const weekEnd = monthEnd.toISOString().split("T")[0];

    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, last_nudge");

    if (!allProfiles || allProfiles.length === 0) {
      return new Response(JSON.stringify({ message: "No users" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let generated = 0;

    for (const profile of allProfiles) {
      const userId = profile.user_id;

      // Check if paper already exists for this month
      const { data: existing } = await supabase
        .from("sunday_papers")
        .select("id")
        .eq("user_id", userId)
        .eq("week_start", weekStart)
        .maybeSingle();

      if (existing) continue;

      // Get user's circle friends
      const { data: ownCircle } = await supabase
        .from("circles")
        .select("id")
        .eq("owner_id", userId)
        .maybeSingle();

      const friendIds: string[] = [];

      if (ownCircle) {
        const { data: members } = await supabase
          .from("circle_members")
          .select("user_id")
          .eq("circle_id", ownCircle.id);
        (members || []).forEach((m: any) => friendIds.push(m.user_id));
      }

      const { data: memberOf } = await supabase
        .from("circle_members")
        .select("circle_id")
        .eq("user_id", userId);

      if (memberOf && memberOf.length > 0) {
        const { data: owners } = await supabase
          .from("circles")
          .select("owner_id")
          .in("id", memberOf.map((m: any) => m.circle_id));
        (owners || []).forEach((o: any) => {
          if (!friendIds.includes(o.owner_id) && o.owner_id !== userId)
            friendIds.push(o.owner_id);
        });
      }

      // Get friends' posts from last month
      let friendPosts: any[] = [];
      if (friendIds.length > 0) {
        const { data } = await supabase
          .from("posts")
          .select("id, user_id, prompt_type, content, created_at, is_recommendation, recommendation_category")
          .in("user_id", friendIds)
          .gte("created_at", lastMonthStart.toISOString())
          .lte("created_at", lastMonthEnd.toISOString())
          .order("created_at", { ascending: false });
        friendPosts = data || [];
      }

      // --- Moment of the Month (most-engaged post from friends) ---
      let momentOfMonth: any = null;
      let imageOfMonthUrl: string | null = null;
      let imageOfMonthPostId: string | null = null;

      if (friendPosts.length > 0) {
        const postIds = friendPosts.map((p: any) => p.id);

        const { data: comments } = await supabase
          .from("comments")
          .select("post_id")
          .in("post_id", postIds);

        const commentCounts = new Map<string, number>();
        (comments || []).forEach((c: any) => {
          commentCounts.set(c.post_id, (commentCounts.get(c.post_id) || 0) + 1);
        });

        let bestPost: any = null;
        let bestScore = -1;
        for (const p of friendPosts) {
          const score = commentCounts.get(p.id) || 0;
          if (score > bestScore || (score === bestScore && bestPost && new Date(p.created_at) > new Date(bestPost.created_at))) {
            bestPost = p;
            bestScore = score;
          }
        }

        if (bestPost) {
          const friendProfile = allProfiles.find((pr: any) => pr.user_id === bestPost.user_id);
          momentOfMonth = {
            post_id: bestPost.id,
            friend_name: friendProfile?.display_name || "a friend",
            content_preview: bestPost.content.length > 120
              ? bestPost.content.substring(0, 120) + "..."
              : bestPost.content,
            prompt_type: bestPost.prompt_type,
            reaction_count: bestScore,
            user_id: bestPost.user_id,
          };
        }

        // --- Image of the Month ---
        const { data: allMedia } = await supabase
          .from("post_media")
          .select("post_id, url, media_type")
          .in("post_id", postIds)
          .eq("media_type", "photo");

        if (allMedia && allMedia.length > 0) {
          let bestImagePost: any = null;
          let bestImageScore = -1;
          for (const media of allMedia) {
            const score = commentCounts.get(media.post_id) || 0;
            if (score > bestImageScore) {
              bestImagePost = media;
              bestImageScore = score;
            }
          }
          if (!bestImagePost || bestImageScore === 0) {
            bestImagePost = allMedia[0];
          }
          if (bestImagePost) {
            imageOfMonthUrl = bestImagePost.url;
            imageOfMonthPostId = bestImagePost.post_id;
          }
        }
      }

      // --- Top Poster Shoutout ---
      let topPosterName: string | null = null;
      let topPosterCount: number | null = null;
      if (friendPosts.length > 0) {
        const byUser = new Map<string, number>();
        for (const p of friendPosts) {
          byUser.set(p.user_id, (byUser.get(p.user_id) || 0) + 1);
        }
        let topUid = "";
        let topCount = 0;
        for (const [uid, count] of byUser) {
          if (count > topCount) {
            topUid = uid;
            topCount = count;
          }
        }
        if (topUid) {
          const friendProfile = allProfiles.find((pr: any) => pr.user_id === topUid);
          topPosterName = friendProfile?.display_name || "a friend";
          topPosterCount = topCount;
        }
      }

      // --- Nudge ---
      const lastNudge = profile.last_nudge || "";
      const availableNudges = NUDGE_SUGGESTIONS.filter((n) => n !== lastNudge);
      const nudge = availableNudges[Math.floor(Math.random() * availableNudges.length)];

      await supabase
        .from("profiles")
        .update({ last_nudge: nudge })
        .eq("user_id", userId);

      // --- Insert paper ---
      await supabase.from("sunday_papers").insert({
        user_id: userId,
        week_start: weekStart,
        week_end: weekEnd,
        moment_of_week_post_id: momentOfMonth?.post_id || null,
        moment_of_week_data: momentOfMonth,
        village_roundup: [],
        your_week: null,
        nudge,
        image_of_week_url: imageOfMonthUrl,
        image_of_week_post_id: imageOfMonthPostId,
        top_poster_name: topPosterName,
        top_poster_count: topPosterCount,
      });

      // --- Notification with smart copy ---
      const recPosts = friendPosts.filter((p: any) => p.is_recommendation);
      let notifTitle: string;

      if (recPosts.length > 0) {
        const latestRec = recPosts[0];
        const recAuthor = allProfiles.find((pr: any) => pr.user_id === latestRec.user_id);
        const recName = recAuthor?.display_name || "a friend";
        const recItem = latestRec.content.length > 40
          ? latestRec.content.substring(0, 40).trimEnd() + "..."
          : latestRec.content;
        notifTitle = `the village monthly is here — ${recName} says you need to try ${recItem}`;
      } else if (momentOfMonth) {
        notifTitle = `the village monthly is here — ${momentOfMonth.friend_name}'s moment made the front page.`;
      } else {
        notifTitle = "the village monthly is here. see what your village has been up to.";
      }

      await supabase.from("notifications").insert({
        user_id: userId,
        type: "village_monthly",
        title: notifTitle,
        body: null,
        reference_id: null,
      });

      generated++;
    }

    return new Response(
      JSON.stringify({ message: `Generated ${generated} monthlies for ${weekStart}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error generating Village Monthly:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
