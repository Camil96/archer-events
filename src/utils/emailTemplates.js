export function buildInviteEmail({ inviteLink, firstName } = {}) {
  const name = String(firstName || "").trim() || "daar";
  const safeInviteLink = String(inviteLink || "").trim();
  const subject = "Je uitnodiging voor Archer Events";
  const body = [
    `Hallo ${name},`,
    "",
    "Je bent uitgenodigd om toegang te krijgen tot Archer Events.",
    "Klik op de link hieronder om je account te activeren en een wachtwoord te kiezen:",
    "",
    safeInviteLink,
    "",
    "Als je deze mail niet verwacht, mag je deze gerust negeren.",
    "",
    "Groeten,",
    "Archer Events",
  ].join("\n");

  return { subject, body };
}
