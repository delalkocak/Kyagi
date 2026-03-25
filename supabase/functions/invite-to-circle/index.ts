import { createClient } from "npm:@supabase/supabase-js@2";

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

async function addToCircle(adminClient: any, circleId: string, userId: string): Promise<boolean> {
  const activeCount = await getActiveCount(adminClient, circleId);
  const isActive = activeCount < MAX_ACTIVE;
  const { error } = await adminClient.from("circle_members")
    .upsert({ circle_id: circleId, user_id: userId, is_active: isActive }, { onConflict: "circle_id,user_id", ignoreDuplicates: true });

  if (error?.message?.includes("circle_active_limit_exceeded")) {
    // DB trigger fired (concurrent insert raced past our count) — add as inactive instead
    await adminClient.from("circle_members")
      .upsert({ circle_id: circleId, user_id: userId, is_active: false }, { onConflict: "circle_id,user_id", ignoreDuplicates: true });
    return false;
  }
  if (error) throw error;
  return isActive;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("invite-to-circle: no auth header");
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error("invite-to-circle: auth failed", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("invite-to-circle: authenticated user", user.id);

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { email, userId } = body;
    console.log("invite-to-circle: body received", JSON.stringify({ email: !!email, userId: !!userId }));

    // Support two modes: direct userId (from search) or email lookup
    let targetUser: { id: string; email?: string } | null = null;
    let targetLabel = "";

    if (userId && typeof userId === "string") {
      // Direct user ID mode (from search)
      if (userId === user.id) {
        return new Response(JSON.stringify({ error: "You can't invite yourself" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify user exists via profiles
      const { data: profile, error: profileError } = await adminClient
        .from("profiles")
        .select("user_id, display_name")
        .eq("user_id", userId)
        .maybeSingle();

      console.log("invite-to-circle: profile lookup", { found: !!profile, error: profileError?.message });

      if (!profile) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      targetUser = { id: profile.user_id };
      targetLabel = profile.display_name;
    } else if (email && typeof email === "string" && email.length <= 255) {
      const trimmedEmail = email.trim().toLowerCase();

      if (trimmedEmail === user.email) {
        return new Response(JSON.stringify({ error: "You can't invite yourself" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find the target user by email using O(1) lookup instead of paginated scan
      const { data: { user: foundUser }, error: getUserError } = await adminClient.auth.admin.getUserByEmail(trimmedEmail);
      if (!getUserError && foundUser) {
        targetUser = foundUser;
      }

      if (!targetUser) {
        return new Response(JSON.stringify({ error: "No user found with that email. They need to create a kyagi account first." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetLabel = trimmedEmail;
    } else {
      console.error("invite-to-circle: no valid email or userId in body", JSON.stringify(body));
      return new Response(JSON.stringify({ error: "Valid email or userId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("invite-to-circle: target user found", targetUser.id);

    // Check if already in each other's circles
    const { data: myCircle } = await adminClient
      .from("circles")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (myCircle) {
      const { data: existingMember } = await adminClient
        .from("circle_members")
        .select("id")
        .eq("circle_id", myCircle.id)
        .eq("user_id", targetUser.id)
        .maybeSingle();

      if (existingMember) {
        return new Response(JSON.stringify({
          success: false,
          status: "already_in_circle",
          message: "Already in your circle",
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check for existing request in EITHER direction
    const { data: existingRequests } = await adminClient
      .from("friend_requests")
      .select("id, status, sender_id, receiver_id")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${targetUser.id}),and(sender_id.eq.${targetUser.id},receiver_id.eq.${user.id})`
      );

    console.log("invite-to-circle: existing requests", existingRequests?.length || 0);

    if (existingRequests && existingRequests.length > 0) {
      for (const r of existingRequests) {
        if (r.status === "pending") {
          if (r.sender_id === targetUser.id && r.receiver_id === user.id) {
            // Auto-accept
            const { error: updateErr } = await adminClient
              .from("friend_requests")
              .update({ status: "accepted" })
              .eq("id", r.id);
            if (updateErr) throw updateErr;

            const { data: theirCircle } = await adminClient
              .from("circles")
              .select("id")
              .eq("owner_id", targetUser.id)
              .maybeSingle();

            let myActive = true;
            let theirActive = true;
            if (myCircle) {
              myActive = await addToCircle(adminClient, myCircle.id, targetUser.id);
            }
            if (theirCircle) {
              theirActive = await addToCircle(adminClient, theirCircle.id, user.id);
            }

            const msg = myActive
              ? `you and ${targetLabel} are now in each other's villages!`
              : `${targetLabel} was added to your friends & family. they'll rotate into your village in the next shuffle.`;

            return new Response(
              JSON.stringify({ success: true, status: "accepted", message: msg }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          return new Response(JSON.stringify({
            success: false,
            status: "pending",
            message: "Request already pending — waiting for them to accept",
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (r.status === "accepted") {
          return new Response(JSON.stringify({
            success: false,
            status: "already_connected",
            message: "You're already connected!",
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (r.status === "denied" && r.sender_id === user.id) {
          await adminClient
            .from("friend_requests")
            .update({ status: "pending", updated_at: new Date().toISOString() })
            .eq("id", r.id);

          return new Response(
            JSON.stringify({ success: true, message: "friend request re-sent!" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Create new friend request
    const { error: insertError } = await adminClient
      .from("friend_requests")
      .insert({ sender_id: user.id, receiver_id: targetUser.id });

    if (insertError) {
      console.error("invite-to-circle: insert error", insertError);
      throw insertError;
    }

    console.log("invite-to-circle: friend request created successfully");

    return new Response(
      JSON.stringify({ success: true, message: "friend request sent! they'll see it on their village page." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("invite-to-circle error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
