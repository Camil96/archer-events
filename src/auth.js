import { supabase } from "./supabaseClient.js";

export function getAuthRedirectUrl() {
  const envUrl = import.meta.env.VITE_APP_URL?.trim();
  const base = envUrl || window.location.origin;
  return `${base.replace(/\/+$/, "")}/`;
}

export function renderAuthLoading(container, message = "Authenticatie controleren...") {
  if (!container) return;
  container.innerHTML = `
    <div style="
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:24px;
      background:#f4f4f4;
    ">
      <div style="
        width:100%;
        max-width:460px;
        background:#ffffff;
        border:1px solid #d6dde6;
        border-radius:18px;
        box-shadow:0 18px 46px rgba(0,0,0,0.12);
        padding:28px 26px;
        text-align:center;
      ">
        <img src="/archer-wordmark.png" alt="Archer" style="height:34px;width:auto;object-fit:contain;" onerror="this.style.display='none'">
        <p style="margin:16px 0 0;color:#2d3036;font-family:Inter,system-ui,-apple-system,sans-serif;font-weight:600;">${String(
          message || "Authenticatie controleren..."
        )}</p>
      </div>
    </div>
  `;
}

export async function getVerifiedSession() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const session = sessionData?.session || null;
  if (!session?.user) return null;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData?.user) return null;

  return { ...session, user: userData.user };
}

export function subscribeToAuthState(onChange) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    onChange?.(event, session || null);
  });

  return () => data?.subscription?.unsubscribe?.();
}

export async function sendMagicLink(email) {
  const cleanEmail = String(email || "").trim();
  if (!cleanEmail) throw new Error("E-mailadres is verplicht.");

  const { error } = await supabase.auth.signInWithOtp({
    email: cleanEmail,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });

  if (error) throw error;
}
