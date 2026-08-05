// Transactional email via Resend API (resend.com). Set EMAIL_API_KEY in env.
// Falls back to console.warn when the key is not set (local dev).
const FROM = 'Home Expense <noreply@expense.patrickho.ca>';

function baseUrl(): string {
  return process.env.APP_BASE_URL ?? 'http://localhost:3000';
}
function verifyLink(token: string): string {
  return `${baseUrl()}/verify?token=${token}`;
}

async function sendResend(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.EMAIL_API_KEY;
  if (!apiKey) { console.warn(`[email stub] ${subject} → ${to}`); return; }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[email] send failed (${res.status}): ${body}`);
  }
}

export async function sendVerifyEmail(email: string, token: string): Promise<void> {
  const link = verifyLink(token);
  const html = `<p>Click <a href="${link}">here</a> to verify your email address.</p>`;
  await sendResend(email, 'Verify your email', html);
}

export async function sendInviteEmail(email: string, link: string): Promise<void> {
  const html = `<p>You have been invited to join a household on Home Expense.</p><p><a href="${link}">Accept invitation</a></p>`;
  await sendResend(email, 'You have been invited to join a household', html);
}

export async function sendPasswordReset(email: string, token: string): Promise<void> {
  const link = `${baseUrl()}/reset?token=${token}`;
  const html = `<p>Click <a href="${link}">here</a> to reset your password.</p>`;
  await sendResend(email, 'Reset your password', html);
}