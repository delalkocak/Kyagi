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
    const supabase = createClient(supabaseUrl, serviceKey);

    // Determine the previous month
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthStart = prevMonth.toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const editionMonth = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

    // Get all active circles
    const { data: circles, error: circlesErr } = await supabase
      .from("circles")
      .select("id, owner_id");

    if (circlesErr) throw circlesErr;
    if (!circles || circles.length === 0) {
      return new Response(JSON.stringify({ message: "No circles found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let created = 0;
    let skipped = 0;

    for (const circle of circles) {
      // Get circle member user_ids + owner
      const { data: members } = await supabase
        .from("circle_members")
        .select("user_id")
        .eq("circle_id", circle.id)
        .eq("is_active", true);

      const memberUserIds = [
        circle.owner_id,
        ...(members || []).map((m: any) => m.user_id),
      ];

      if (memberUserIds.length === 0) {
        skipped++;
        continue;
      }

      // Check for recommendation posts from circle members in the previous month
      const { count, error: countErr } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .in("user_id", memberUserIds)
        .not("recommendation_category", "is", null)
        .gte("created_at", monthStart)
        .lt("created_at", monthEnd);

      if (countErr) {
        console.error(`Error checking posts for circle ${circle.id}:`, countErr);
        skipped++;
        continue;
      }

      if (!count || count === 0) {
        skipped++;
        continue;
      }

      // Check if edition already exists
      const { data: existing } = await supabase
        .from("village_monthly_editions")
        .select("id")
        .eq("circle_id", circle.id)
        .eq("edition_month", editionMonth)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      // Create the edition
      const { error: insertErr } = await supabase
        .from("village_monthly_editions")
        .insert({
          circle_id: circle.id,
          edition_month: editionMonth,
          published_at: now.toISOString(),
        });

      if (insertErr) {
        console.error(`Error creating edition for circle ${circle.id}:`, insertErr);
        skipped++;
      } else {
        created++;
      }
    }

    return new Response(
      JSON.stringify({ message: `Created ${created} editions, skipped ${skipped}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-monthly error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
