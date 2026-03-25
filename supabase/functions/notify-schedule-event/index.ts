import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Handles schedule request notifications:
// - New request (pending)
// - Confirmation (accepted)
// Called via database webhook on schedule_requests INSERT/UPDATE
// Requires x-webhook-secret header matching WEBHOOK_SECRET env var.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const webhookSecret = Deno.env.get("WEBHOOK_SECRET") ?? "";
  const providedSecret = req.headers.get("x-webhook-secret") ?? "";
  if (!webhookSecret || providedSecret !== webhookSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { type, record, old_record } = await req.json();

    if (!record) {
      return new Response(JSON.stringify({ error: "no record" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const senderId = record.sender_id;
    const recipientId = record.recipient_id;
    const activity = record.activity || "an activity";
    const proposedDate = record.proposed_date;
    const proposedTimeSlot = record.proposed_time_slot;
    const status = record.status;
    const requestId = record.id;

    // Format the date nicely
    const dateObj = new Date(proposedDate + "T00:00:00");
    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });

    if (type === "INSERT" && status === "pending") {
      // New request - notify recipient
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", senderId)
        .single();

      const firstName = (senderProfile?.display_name || "someone").split(" ")[0];

      await supabase.functions.invoke("send-push-notification", {
        body: {
          userId: recipientId,
          title: `${firstName} invited you`,
          body: `join ${activity} on ${dayName} at ${proposedTimeSlot}?`,
          data: { route: "/schedule", requestId },
          tag: `schedule-${requestId}`,
        },
      });

      return new Response(JSON.stringify({ sent: 1, subtype: "request" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (
      type === "UPDATE" &&
      status === "accepted" &&
      old_record?.status === "pending"
    ) {
      // Confirmation - notify sender
      await supabase.functions.invoke("send-push-notification", {
        body: {
          userId: senderId,
          title: "you're going!",
          body: `${activity} is confirmed for ${dayName}.`,
          data: { route: "/schedule", requestId },
          tag: `schedule-confirmed-${requestId}`,
        },
      });

      return new Response(
        JSON.stringify({ sent: 1, subtype: "confirmation" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ sent: 0, reason: "no matching trigger" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
