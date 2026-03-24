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

    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ error: "Invalid invite code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up the invite code
    const { data: invite, error: inviteError } = await adminClient
      .from("invite_codes")
      .select("*")
      .eq("code", code.trim())
      .maybeSingle();

    if (inviteError) throw inviteError;
    if (!invite) {
      return new Response(JSON.stringify({ error: "Invite code not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invite.used_by) {
      return new Response(JSON.stringify({ error: "This invite link has already been used" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invite.inviter_id === user.id) {
      return new Response(JSON.stringify({ error: "You can't use your own invite link" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark the invite code as used
    await adminClient
      .from("invite_codes")
      .update({ used_by: user.id, used_at: new Date().toISOString() })
      .eq("id", invite.id);

    // Create a mutual friend request (auto-accepted)
    // Check for existing connection first
    const { data: existingRequests } = await adminClient
      .from("friend_requests")
      .select("id, status")
      .or(
        `and(sender_id.eq.${invite.inviter_id},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${invite.inviter_id})`
      );

    const hasActiveConnection = existingRequests?.some(r => r.status === "accepted");
    if (hasActiveConnection) {
      return new Response(JSON.stringify({ success: true, message: "You're already connected!" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create auto-accepted friend request
    const pendingReq = existingRequests?.find(r => r.status === "pending");
    if (pendingReq) {
      await adminClient
        .from("friend_requests")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", pendingReq.id);
    } else {
      await adminClient
        .from("friend_requests")
        .insert({ sender_id: invite.inviter_id, receiver_id: user.id, status: "accepted" });
    }

    // Add to both circles
    const { data: inviterCircle } = await adminClient
      .from("circles")
      .select("id")
      .eq("owner_id", invite.inviter_id)
      .maybeSingle();

    const { data: userCircle } = await adminClient
      .from("circles")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (inviterCircle) {
      await adminClient.from("circle_members")
        .upsert({ circle_id: inviterCircle.id, user_id: user.id }, { onConflict: "circle_id,user_id", ignoreDuplicates: true });
    }
    if (userCircle) {
      await adminClient.from("circle_members")
        .upsert({ circle_id: userCircle.id, user_id: invite.inviter_id }, { onConflict: "circle_id,user_id", ignoreDuplicates: true });
    }

    // Get inviter name for the message
    const { data: inviterProfile } = await adminClient
      .from("profiles")
      .select("display_name")
      .eq("user_id", invite.inviter_id)
      .maybeSingle();

    const inviterName = inviterProfile?.display_name || "your friend";

    // Get new user's name
    const { data: newUserProfile } = await adminClient
      .from("profiles")
      .select("display_name, is_team_account")
      .eq("user_id", user.id)
      .maybeSingle();

    const isTeamAccount = newUserProfile?.is_team_account === true;

    // If non-team friend joined, notify inviter and update onboarding step
    if (!isTeamAccount) {
      const newUserName = newUserProfile?.display_name || "someone";
      await adminClient.from("notifications").insert({
        user_id: invite.inviter_id,
        type: "friend_joined",
        title: `${newUserName} joined your village!`,
        reference_id: user.id,
      });

      // Update inviter's onboarding_step to 'activated' if currently 'exploring'
      await adminClient
        .from("profiles")
        .update({ onboarding_step: "activated" })
        .eq("user_id", invite.inviter_id)
        .eq("onboarding_step", "exploring");
    }

    return new Response(
      JSON.stringify({ success: true, message: `you're now in ${inviterName}'s circle! 🎉` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("redeem-invite error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
