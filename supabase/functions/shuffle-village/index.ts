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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    const MAX_ACTIVE = 20;

    // Get all circles
    const { data: circles, error: circlesErr } = await admin
      .from("circles")
      .select("id, owner_id");

    if (circlesErr) throw circlesErr;

    let shuffledCount = 0;

    for (const circle of circles || []) {
      // Get all members of this circle
      const { data: members, error: membersErr } = await admin
        .from("circle_members")
        .select("id, user_id, is_active")
        .eq("circle_id", circle.id);

      if (membersErr) {
        console.error(`Error fetching members for circle ${circle.id}:`, membersErr);
        continue;
      }

      if (!members || members.length <= MAX_ACTIVE) {
        // Everyone can be active — set all to active
        if (members && members.some((m) => !m.is_active)) {
          const ids = members.filter((m) => !m.is_active).map((m) => m.id);
          await admin
            .from("circle_members")
            .update({ is_active: true })
            .in("id", ids);
        }
        continue;
      }

      // Shuffle: randomly pick MAX_ACTIVE members
      const shuffled = [...members].sort(() => Math.random() - 0.5);
      const activeIds = shuffled.slice(0, MAX_ACTIVE).map((m) => m.id);
      const inactiveIds = shuffled.slice(MAX_ACTIVE).map((m) => m.id);

      // Set active
      if (activeIds.length > 0) {
        await admin
          .from("circle_members")
          .update({ is_active: true })
          .in("id", activeIds);
      }

      // Set inactive
      if (inactiveIds.length > 0) {
        await admin
          .from("circle_members")
          .update({ is_active: false })
          .in("id", inactiveIds);
      }

      // Notify the circle owner
      await admin.from("notifications").insert({
        user_id: circle.owner_id,
        type: "village_shuffle",
        title: "your village just shuffled! see who's in rotation this month.",
      });

      shuffledCount++;
    }

    return new Response(
      JSON.stringify({ success: true, shuffled: shuffledCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("shuffle-village error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
