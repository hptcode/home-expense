// Transactional email sender (ADR-0005). Wire to Resend/Postmark/Brevo via env.
// Until EMAIL_API_KEY is set we log the link so local dev never crashes.
export async function sendVerifyEmail(email: string, token: string): Promise<void> {
  const link = verifyLink(token);
  if (!process.env.EMAIL_API_KEY) { console.warn(`[email stub] verify ${email}: ${link}`); return; }
  // TODO: provider.send({ to: email, template: 'verify', link });
  void link;
}
export async function sendInviteEmail(email: string, link: string): Promise<void> {
  if (!process.env.EMAIL_API_KEY) { console.warn(`[email stub] invite ${email}: ${link}`); return; }
  // TODO: provider.send({ to: email, template: 'invite', link });
}

export async function sendPasswordReset(email: string, token: string): Promise<void> {
  const link = `${baseUrl()}/reset?token=${token}`;
  if (!process.env.EMAIL_API_KEY) { console.warn(`[email stub] reset ${email}: ${link}`); return; }
  void link;
}
function baseUrl(): string { return process.env.APP_BASE_URL ?? 'http://localhost:3000'; }
function verifyLink(token: string): string { return `${baseUrl()}/verify?token=${token}`; }
