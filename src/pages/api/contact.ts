// src/pages/api/contact.ts
//
// Resend-backed POST endpoint for the contact form (/en/contact). The form
// submits a `multipart/form-data` payload; we validate, honeypot-filter,
// rate-limit per IP, and dispatch via Resend to office@drgladysz.com.
//
// `prerender = false` opts this single route into Vercel's serverless
// runtime while the rest of the site stays static (output: 'static' in
// astro.config.mjs).
//
// Resend sends from `noreply@send.drgladysz.com` — a sending subdomain
// configured separately in Resend so it doesn't conflict with the existing
// iCloud Custom Domain MX on the apex. SPF / DKIM / return-path records
// for `send.drgladysz.com` live at Zenbox.
import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

// 5 submissions per IP per hour (sliding window). Each entry stores its
// own send timestamp; we keep the IP's recent timestamps and reject when
// at-or-over RATE_LIMIT_MAX still fall inside the window.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

const NAME_MAX = 120;
const EMAIL_MAX = 320;
const SUBJECT_MAX = 160;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 4000;

const ALLOWED_CONTEXTS = new Set([
  'clinical',
  'editorial',
  'professional',
  'other',
]);

// User-facing labels per the locked contact-page draft v1.0 (the four
// "Type of enquiry" options). Internal enum keys preserved for backwards
// compatibility with the existing rate-limit map and any analytics that
// already keyed on them; the labels here are what appears in the inbox.
const CONTEXT_LABELS: Record<string, string> = {
  professional: 'Professional / academic',
  clinical: 'Patient information',
  editorial: 'Media or speaking',
  other: 'Other',
};

// In-memory map keyed by IP → array of recent submission timestamps.
// Resets on cold start; for higher volume move to KV / Upstash.
const rateLimitMap = new Map<string, number[]>();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function checkRateLimit(ip: string, now: number): boolean {
  const entries = rateLimitMap.get(ip) ?? [];
  const fresh = entries.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  rateLimitMap.set(ip, fresh);
  return fresh.length < RATE_LIMIT_MAX;
}

function recordSubmission(ip: string, now: number) {
  const entries = rateLimitMap.get(ip) ?? [];
  entries.push(now);
  rateLimitMap.set(ip, entries);
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const apiKey = import.meta.env.RESEND_API_KEY;
  const toEmail =
    import.meta.env.CONTACT_FORM_TO_EMAIL || 'office@drgladysz.com';
  if (!apiKey) {
    return jsonResponse({ ok: false, error: 'server_misconfigured' }, 500);
  }

  const ip = clientAddress || 'unknown';
  const now = Date.now();
  if (!checkRateLimit(ip, now)) {
    return jsonResponse({ ok: false, error: 'rate_limited' }, 429);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse({ ok: false, error: 'invalid_form_data' }, 400);
  }

  // Honeypot — bots fill every field. Real users see the hidden field as
  // off-screen and skip it. Silent success on trip so we don't tip the bot.
  const honeypot = formData.get('website');
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    return jsonResponse({ ok: true });
  }

  const name = (formData.get('Name') ?? '').toString().trim();
  const email = (formData.get('Email') ?? '').toString().trim();
  const context = (formData.get('Context') ?? '').toString().trim();
  const subject = (formData.get('Subject') ?? '').toString().trim();
  const message = (formData.get('Message') ?? '').toString().trim();
  const consentRaw = (formData.get('Consent') ?? '')
    .toString()
    .trim()
    .toLowerCase();
  const consent =
    consentRaw === 'on' || consentRaw === 'true' || consentRaw === '1';

  if (!name || name.length > NAME_MAX) {
    return jsonResponse({ ok: false, error: 'invalid_name' }, 400);
  }
  if (!email || email.length > EMAIL_MAX || !isValidEmail(email)) {
    return jsonResponse({ ok: false, error: 'invalid_email' }, 400);
  }
  if (!ALLOWED_CONTEXTS.has(context)) {
    return jsonResponse({ ok: false, error: 'invalid_context' }, 400);
  }
  if (!subject || subject.length > SUBJECT_MAX) {
    return jsonResponse({ ok: false, error: 'invalid_subject' }, 400);
  }
  if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) {
    return jsonResponse({ ok: false, error: 'invalid_message' }, 400);
  }
  if (!consent) {
    return jsonResponse({ ok: false, error: 'invalid_consent' }, 400);
  }

  const contextLabel = CONTEXT_LABELS[context] ?? context;

  const resend = new Resend(apiKey);
  try {
    const { error } = await resend.emails.send({
      from: 'drgladysz.com <noreply@send.drgladysz.com>',
      to: toEmail,
      replyTo: email,
      subject: `Contact form — ${name} — ${subject}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Type of enquiry: ${contextLabel}`,
        `Subject: ${subject}`,
        `Privacy consent: granted (${new Date(now).toISOString()})`,
        `IP: ${ip}`,
        '',
        'Message:',
        message,
      ].join('\n'),
    });
    if (error) {
      return jsonResponse({ ok: false, error: 'send_failed' }, 502);
    }
  } catch {
    return jsonResponse({ ok: false, error: 'send_failed' }, 502);
  }

  recordSubmission(ip, now);
  return jsonResponse({ ok: true });
};
