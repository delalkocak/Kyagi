import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Web Push crypto helpers for VAPID
// Using the web-push protocol directly via Web Crypto API

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  tag?: string;
}

async function sendWebPush(
  subscription: any,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
) {
  const endpoint = subscription.endpoint;

  // Import the key for signing
  const rawPrivateKey = base64UrlToUint8Array(vapidPrivateKey);
  const rawPublicKey = base64UrlToUint8Array(vapidPublicKey);

  // Create JWT for VAPID
  const audience = new URL(endpoint).origin;
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: vapidSubject,
  };

  const headerB64 = btoa(JSON.stringify(header))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const payloadB64 = btoa(JSON.stringify(jwtPayload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const unsignedToken = `${headerB64}.${payloadB64}`;
  const unsignedTokenBytes = new TextEncoder().encode(unsignedToken);

  // Import private key for ECDSA signing
  const privateKeyJwk = {
    kty: "EC",
    crv: "P-256",
    d: uint8ArrayToBase64Url(rawPrivateKey),
    x: uint8ArrayToBase64Url(rawPublicKey.slice(1, 33)),
    y: uint8ArrayToBase64Url(rawPublicKey.slice(33, 65)),
  };

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    unsignedTokenBytes
  );

  // Convert from DER to raw r||s format if needed
  const signature = new Uint8Array(signatureBuffer);
  const signatureB64 = uint8ArrayToBase64Url(
    signature.length === 64 ? signature : derToRaw(signature)
  );
  const jwt = `${unsignedToken}.${signatureB64}`;

  const vapidKeyB64 = uint8ArrayToBase64Url(rawPublicKey);

  // Send the push message (unencrypted for simplicity - content goes as payload)
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapidKeyB64}`,
      "Content-Type": "application/json",
      "Content-Length": payload.length.toString(),
      TTL: "86400",
    },
    body: payload,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Push send failed (${response.status}): ${text}`);
  }

  return response;
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr;
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function derToRaw(der: Uint8Array): Uint8Array {
  // Parse DER-encoded ECDSA signature to raw r||s
  const raw = new Uint8Array(64);
  let offset = 2;
  const rLen = der[offset + 1];
  offset += 2;
  const rStart = rLen > 32 ? offset + (rLen - 32) : offset;
  const rDest = rLen < 32 ? 32 - rLen : 0;
  raw.set(der.slice(rStart, rStart + Math.min(rLen, 32)), rDest);
  offset += rLen;
  const sLen = der[offset + 1];
  offset += 2;
  const sStart = sLen > 32 ? offset + (sLen - 32) : offset;
  const sDest = sLen < 32 ? 64 - sLen : 32;
  raw.set(der.slice(sStart, sStart + Math.min(sLen, 32)), sDest);
  return raw;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const vapidSubject = Deno.env.get("VAPID_SUBJECT")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { userId, title, body, data, tag } =
      (await req.json()) as PushPayload;

    if (!userId || !title) {
      return new Response(
        JSON.stringify({ error: "userId and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's push subscriptions
    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", userId);

    if (subsError) throw subsError;
    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, reason: "no subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({ title, body, data, tag });
    let sent = 0;
    const errors: string[] = [];

    for (const sub of subs) {
      try {
        await sendWebPush(
          sub.subscription,
          payload,
          vapidPublicKey,
          vapidPrivateKey,
          vapidSubject
        );
        sent++;
      } catch (err) {
        errors.push(err.message);
        // If subscription is expired/invalid, clean it up
        if (err.message.includes("410") || err.message.includes("404")) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", userId)
            .eq("subscription", sub.subscription);
        }
      }
    }

    return new Response(
      JSON.stringify({ sent, errors: errors.length > 0 ? errors : undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
