import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  const weekStart = monday.toISOString().split("T")[0];
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekEnd = sunday.toISOString().split("T")[0];

  // Get all friend priorities for this week
  const { data: priorities, error: pErr } = await supabase
    .from("weekly_friend_priorities")
    .select("user_id, friend_id")
    .eq("week_start", weekStart);

  if (pErr || !priorities || priorities.length === 0) {
    return new Response(JSON.stringify({ nudges: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let nudgeCount = 0;

  for (const priority of priorities) {
    const { user_id, friend_id } = priority;

    // Get user's availability this week
    const { data: userAvail } = await supabase
      .from("availability_blocks")
      .select("date, time_slot")
      .eq("user_id", user_id)
      .gte("date", weekStart)
      .lte("date", weekEnd);

    // Get friend's availability this week
    const { data: friendAvail } = await supabase
      .from("availability_blocks")
      .select("date, time_slot")
      .eq("user_id", friend_id)
      .gte("date", weekStart)
      .lte("date", weekEnd);

    if (!userAvail || !friendAvail || userAvail.length === 0 || friendAvail.length === 0) continue;

    // Find overlaps
    const friendSet = new Set(friendAvail.map(a => `${a.date}|${a.time_slot}`));
    const overlaps = userAvail.filter(a => friendSet.has(`${a.date}|${a.time_slot}`));

    if (overlaps.length === 0) continue;

    // Check if we already sent a weekly_nudge for this pair this week
    const { data: existingNotif } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", user_id)
      .eq("type", "weekly_nudge")
      .eq("reference_id", friend_id)
      .gte("created_at", `${weekStart}T00:00:00Z`)
      .limit(1);

    if (existingNotif && existingNotif.length > 0) continue;

    // Check no existing schedule_request between them for overlapping dates
    const overlapDates = [...new Set(overlaps.map(o => o.date))];
    const { data: existingReqs } = await supabase
      .from("schedule_requests")
      .select("id")
      .in("proposed_date", overlapDates)
      .or(`and(sender_id.eq.${user_id},recipient_id.eq.${friend_id}),and(sender_id.eq.${friend_id},recipient_id.eq.${user_id})`);

    if (existingReqs && existingReqs.length > 0) continue;

    // Get friend's name
    const { data: friendProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", friend_id)
      .single();

    const friendName = friendProfile?.display_name || "your friend";
    const overlap = overlaps[0]; // Use first overlap for the message
    const overlapDate = new Date(overlap.date + "T00:00:00");
    const dayName = overlapDate.toLocaleDateString("en", { weekday: "long" });
    const slotLabel = overlap.time_slot.replace("_", " ");

    await supabase.from("notifications").insert({
      user_id,
      type: "weekly_nudge",
      title: `${friendName}'s free ${dayName} ${slotLabel} too. just saying.`,
      reference_id: friend_id,
    });

    nudgeCount++;
  }

  return new Response(
    JSON.stringify({ nudges: nudgeCount }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
