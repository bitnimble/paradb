/**
 * Reads the signup confirmation email out of Supabase's local mail catcher and returns the
 * `/signup/confirm` link, so the E2E flow can complete real email confirmation without SMTP.
 *
 * Supabase has shipped two different catchers under the `[inbucket]` config over time (Inbucket and,
 * more recently, Mailpit) on the same port, with different REST APIs. We try both so the suite works
 * regardless of which one the installed CLI bundles.
 */
const MAIL_BASE = process.env.SUPABASE_INBUCKET_URL || 'http://127.0.0.1:54324';

const CONFIRM_LINK = /(https?:\/\/[^\s"'<>]*\/signup\/confirm\?[^\s"'<>]*)/;

function extractConfirmLink(body: string): string | undefined {
  const match = body.match(CONFIRM_LINK);
  if (!match) {
    return undefined;
  }
  // Email bodies HTML-encode the ampersands between query params; undo that so the link is usable.
  return match[1].replace(/&amp;/g, '&');
}

async function fetchJson(url: string): Promise<any | undefined> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      return undefined;
    }
    return await resp.json();
  } catch {
    return undefined;
  }
}

// Mailpit: search by recipient, then fetch the message's rendered bodies.
async function tryMailpit(email: string): Promise<string | undefined> {
  const search = await fetchJson(
    `${MAIL_BASE}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`
  );
  const id = search?.messages?.[0]?.ID;
  if (!id) {
    return undefined;
  }
  const message = await fetchJson(`${MAIL_BASE}/api/v1/message/${id}`);
  if (!message) {
    return undefined;
  }
  return extractConfirmLink(`${message.HTML ?? ''}\n${message.Text ?? ''}`);
}

// Inbucket: list the mailbox (named by the local part of the address), then fetch the newest message.
async function tryInbucket(email: string): Promise<string | undefined> {
  const mailbox = email.split('@')[0];
  const messages = await fetchJson(`${MAIL_BASE}/api/v1/mailbox/${mailbox}`);
  if (!Array.isArray(messages) || messages.length === 0) {
    return undefined;
  }
  // Pick the most recent message by date so we're agnostic to the API's list ordering (and pick the
  // latest if a confirmation was ever resent). Tolerate lower/upper-case field names across versions.
  const at = (m: any) => new Date(m.date ?? m.Date ?? 0).getTime();
  const newest = messages.reduce((a, b) => (at(b) >= at(a) ? b : a));
  const id = newest.id ?? newest.Id;
  const message = await fetchJson(`${MAIL_BASE}/api/v1/mailbox/${mailbox}/${id}`);
  const body = message?.body;
  if (!body) {
    return undefined;
  }
  return extractConfirmLink(`${body.html ?? ''}\n${body.text ?? ''}`);
}

/**
 * Polls the mail catcher until the confirmation email for `email` arrives, returning its
 * `/signup/confirm` link. Throws if it never shows up within the timeout.
 */
export async function getConfirmationLink(
  email: string,
  { timeoutMs = 30_000, intervalMs = 1_000 } = {}
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const link = (await tryMailpit(email)) ?? (await tryInbucket(email));
    if (link) {
      return link;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`No confirmation email arrived for ${email} within ${timeoutMs}ms`);
}
