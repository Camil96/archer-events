export function buildInviteEmail({ appName = "Archer Events", inviteLink, firstName } = {}) {
  const name = String(firstName || "").trim() || "daar";
  const safeInviteLink = String(inviteLink || "").trim();
  const subject = `Je uitnodiging voor ${appName}`;
  const text = [
    `Hallo ${name},`,
    "",
    `Je bent uitgenodigd om toegang te krijgen tot ${appName}.`,
    "Klik op de knop hieronder om je account te activeren en een wachtwoord te kiezen:",
    "",
    safeInviteLink,
    "",
    "Als je deze mail niet verwacht, mag je deze gerust negeren.",
  ].join("\n");

  const html = `
    <p>Hallo ${name},</p>
    <p>Je bent uitgenodigd om toegang te krijgen tot <strong>${appName}</strong>.</p>
    <p>Klik op de knop hieronder om je account te activeren en een wachtwoord te kiezen:</p>
    <p><a href="${safeInviteLink}" style="display:inline-block;padding:10px 16px;border-radius:999px;background:#2563eb;color:#fff;text-decoration:none;">Activeer je account</a></p>
    <p>Werkt de knop niet? Kopieer dan deze link in je browser:</p>
    <p><code>${safeInviteLink}</code></p>
    <p>Groeten,<br />Archer Events</p>
  `;

  return { subject, text, html };
}
