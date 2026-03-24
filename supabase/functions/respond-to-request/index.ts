import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_ACTIVE = 20;

async function getActiveCount(adminClient: any, circleId: string): Promise<number> {
  const { count } = await adminClient
    .from("circle_members")
    .select("id", { count: "exact", head: true })
    .eq("circle_id", circleId)
    .eq("is_active", true);
  return count || 0;
}

async function addToCircle(adminClient: any, circleId: string, userId: string) {
  const activeCount = await getActiveCount(adminClient, circleId);
  const isActive = activeCount < MAX_ACTIVE;
  await adminClient.from("circle_members")
    .upsert({ circle_id: circleId, user_id: userId, is_active: isActive }, { onConflict: "circle_id,user_id", ignoreDuplicates: true });
  return isActive;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { requestId, accept } = await req.json();

    if (!requestId || typeof accept !== "boolean") {
      return new Response(JSON.stringify({ error: "requestId and accept (boolean) required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: request, error: fetchError } = await adminClient
      .from("friend_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !request) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.receiver_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not your request to respond to" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.status !== "pending") {
      return new Response(JSON.stringify({ error: "Request already responded to" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newStatus = accept ? "accepted" : "denied";
    const { error: updateError } = await adminClient
      .from("friend_requests")
      .update({ status: newStatus })
      .eq("id", requestId);

    if (updateError) throw updateError;

    if (accept) {
      const senderId = request.sender_id;
      const receiverId = request.receiver_id;

      const { data: senderCircle } = await adminClient
        .from("circles")
        .select("id")
        .eq("owner_id", senderId)
        .maybeSingle();

      const { data: receiverCircle } = await adminClient
        .from("circles")
        .select("id")
        .eq("owner_id", receiverId)
        .maybeSingle();

      if (senderCircle) {
        await addToCircle(adminClient, senderCircle.id, receiverId);
      }

      if (receiverCircle) {
        await addToCircle(adminClient, receiverCircle.id, senderId);
      }
    }

    return new Response(
      JSON.stringify({ success: true, status: newStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("respond-to-request error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
