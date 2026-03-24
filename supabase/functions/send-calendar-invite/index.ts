import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIME_BLOCKS: Record<string, { start: string; end: string }> = {
  early_morning: { start: "06:30", end: "08:30" },
  morning: { start: "09:00", end: "12:00" },
  afternoon: { start: "12:30", end: "17:00" },
  evening: { start: "18:00", end: "21:30" },
};

function formatICSDate(dateStr: string, time: string): string {
  const [year, month, day] = dateStr.split("-");
  const [hour, minute] = time.split(":");
  return `${year}${month}${day}T${hour}${minute}00`;
}

function generateICS({
  summary,
  dtstart,
  dtend,
  description,
  timezone,
}: {
  summary: string;
  dtstart: string;
  dtend: string;
  description: string;
  timezone?: string;
}): string {
  const uid = crypto.randomUUID() + "@kyagi.app";
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kyagi//Hangout//EN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
  ];

  // If timezone is provided, use TZID parameter for local time interpretation
  if (timezone) {
    lines.push(`DTSTART;TZID=${timezone}:${dtstart}`);
    lines.push(`DTEND;TZID=${timezone}:${dtend}`);
  } else {
    // Fallback: treat as floating time (no timezone = calendar app uses local)
    lines.push(`DTSTART:${dtstart}`);
    lines.push(`DTEND:${dtend}`);
  }

  lines.push(
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR"
  );

  return lines.join("\r\n");
}

async function sendCalendarEmail(
  resendKey: string,
  toEmail: string,
  subject: string,
  icsContent: string
) {
  const icsBase64 = btoa(icsContent);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Kyagi <onboarding@resend.dev>",
      to: [toEmail],
      subject,
      html: "<p>Your hangout is confirmed! Open the attached invite to add it to your calendar.</p>",
      attachments: [
        {
          filename: "hangout.ics",
          content: icsBase64,
          content_type: "text/calendar; method=REQUEST",
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API error: ${res.status} - ${err}`);
  }

  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY")!;

    // Verify the calling user
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

    const { requestId, activity, proposedDate, timeSlot, senderId, recipientId } = await req.json();

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get both users' profiles (including timezone) and emails
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("user_id, display_name, timezone")
      .in("user_id", [senderId, recipientId]);

    const { data: users } = await adminClient.auth.admin.listUsers();
    
    const senderProfile = profiles?.find((p: any) => p.user_id === senderId);
    const recipientProfile = profiles?.find((p: any) => p.user_id === recipientId);
    const senderUser = users?.users?.find((u: any) => u.id === senderId);
    const recipientUser = users?.users?.find((u: any) => u.id === recipientId);

    if (!senderUser?.email || !recipientUser?.email) {
      return new Response(JSON.stringify({ error: "Could not find user emails" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const senderName = senderProfile?.display_name || "your friend";
    const recipientName = recipientProfile?.display_name || "your friend";
    const activityName = activity || "hangout";

    // Use sender's timezone as the event timezone (since they proposed the time)
    // If not available, fall back to recipient's or no timezone
    const eventTimezone = (senderProfile as any)?.timezone || (recipientProfile as any)?.timezone || null;

    const block = TIME_BLOCKS[timeSlot] || TIME_BLOCKS.morning;
    const dtstart = formatICSDate(proposedDate, block.start);
    const dtend = formatICSDate(proposedDate, block.end);

    const dateFormatted = new Date(proposedDate + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    // Generate ICS with timezone for each participant
    // Sender gets ICS in sender's timezone, recipient in sender's timezone too
    // (since the sender proposed the time in their local context)
    const senderICS = generateICS({
      summary: `${activityName} with ${recipientName}`,
      dtstart,
      dtend,
      description: "Planned on Kyagi",
      timezone: (senderProfile as any)?.timezone || eventTimezone,
    });
    const senderSubject = `Kyagi Hangout: ${activityName} with ${recipientName} — ${dateFormatted}`;

    const recipientICS = generateICS({
      summary: `${activityName} with ${senderName}`,
      dtstart,
      dtend,
      description: "Planned on Kyagi",
      timezone: (senderProfile as any)?.timezone || eventTimezone,
    });
    const recipientSubject = `Kyagi Hangout: ${activityName} with ${senderName} — ${dateFormatted}`;

    // Send both emails, don't fail if one errors
    const results = await Promise.allSettled([
      sendCalendarEmail(resendKey, senderUser.email, senderSubject, senderICS),
      sendCalendarEmail(resendKey, recipientUser.email, recipientSubject, recipientICS),
    ]);

    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(`Failed to send email ${i}:`, r.reason);
      }
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-calendar-invite error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
