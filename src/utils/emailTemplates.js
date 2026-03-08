export function buildInviteEmail({ appBaseUrl, inviteToken, firstName, brandContext = "Archer Events" }) {
  const safeName = String(firstName || "").trim() || "collega";
  const base = String(appBaseUrl || "").replace(/\/+$/, "");
  const token = encodeURIComponent(String(inviteToken || "").trim());
  const inviteLink = `${base}/invite?token=${token}`;

  const subject = "Je uitnodiging voor Archer Events";
  const text = [
    `Hallo ${safeName},`,
    "",
    `Je bent uitgenodigd voor ${brandContext}.`,
    "Klik op onderstaande link om je account te activeren en een wachtwoord te kiezen:",
    inviteLink,
    "",
    "Deze link verloopt automatisch na 7 dagen.",
    "",
    "Team Archer",
  ].join("\n");

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#1f2937;">
      <h2 style="margin:0 0 12px;color:#111827;">Je uitnodiging voor Archer Events</h2>
      <p>Hallo <strong>${safeName}</strong>,</p>
      <p>Je bent uitgenodigd voor <strong>${brandContext}</strong>.</p>
      <p>Klik op de knop hieronder om je account te activeren en een wachtwoord te kiezen.</p>
      <p style="margin:20px 0;">
        <a href="${inviteLink}" style="display:inline-block;background:#4d73ff;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">Activeer je account</a>
      </p>
      <p style="font-size:14px;color:#4b5563;">Deze link verloopt automatisch na 7 dagen.</p>
      <p style="font-size:14px;color:#4b5563;">Team Archer</p>
    </div>
  `;

  return {
    subject,
    text,
    html,
    inviteLink,
  };
}
