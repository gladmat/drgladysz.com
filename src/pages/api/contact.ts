// src/pages/api/contact.ts
//
// Resend-backed POST endpoint for the contact form (/en/contact). The form
// submits a `multipart/form-data` payload; we validate, honeypot-filter,
// rate-limit per IP, and dispatch via Resend to mateusz@drgladysz.com.
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

const RATE_LIMIT_WINDOW_MS = 60_000;
const NAME_MAX = 200;
const EMAIL_MAX = 320;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 5000;

const ALLOWED_CONTEXTS = new Set([
  'clinical',
  'editorial',
  'professional',
  'other',
]);

const CONTEXT_LABELS: Record<string, string> = {
  clinical: 'Clinical referral / second opinion',
  editorial: 'Editorial correction / citation request',
  professional: 'Professional correspondence',
  other: 'Other',
};

// In-memory map keyed by IP. Resets on cold start, which on Vercel's
// serverless runtime means roughly every minute of inactivity — fine for
// a low-volume contact form. For higher volume move to KV / Upstash.
const rateLimitMap = new Map<string, number>();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const apiKey = import.meta.env.RESEND_API_KEY;
  const toEmail =
    import.meta.env.CONTACT_FORM_TO_EMAIL || 'mateusz@drgladysz.com';
  if (!apiKey) {
    return jsonResponse({ ok: false, error: 'server_misconfigured' }, 500);
  }

  const ip = clientAddress || 'unknown';
  const now = Date.now();
  const last = rateLimitMap.get(ip) ?? 0;
  if (now - last < RATE_LIMIT_WINDOW_MS) {
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
  const message = (formData.get('Message') ?? '').toString().trim();

  if (!name || name.length > NAME_MAX) {
    return jsonResponse({ ok: false, error: 'invalid_name' }, 400);
  }
  if (!email || email.length > EMAIL_MAX || !isValidEmail(email)) {
    return jsonResponse({ ok: false, error: 'invalid_email' }, 400);
  }
  if (!ALLOWED_CONTEXTS.has(context)) {
    return jsonResponse({ ok: false, error: 'invalid_context' }, 400);
  }
  if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) {
    return jsonResponse({ ok: false, error: 'invalid_message' }, 400);
  }

  const resend = new Resend(apiKey);
  try {
    const { error } = await resend.emails.send({
      from: 'drgladysz.com <noreply@send.drgladysz.com>',
      to: toEmail,
      replyTo: email,
      subject: `Contact form — ${name} (${CONTEXT_LABELS[context] ?? context})`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Context: ${CONTEXT_LABELS[context] ?? context}`,
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

  rateLimitMap.set(ip, now);
  return jsonResponse({ ok: true });
};
