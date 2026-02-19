export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() || "";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || "";

// Brandbook + live-site aligned palette anchors:
// - Core palette: #000000, #2d3036, #a6b3c0, #f4f4f4, #0000ff
// - UI range: #4d73ff, #85aeff, #a9d0ff
export const BRAND_THEMES = {
  archer_academy: {
    key: "archer_academy",
    id: "academy",
    label: "Academy",
    aliases: [
      "archer_academy",
      "academy",
      "Academy",
      "Archer Academy",
      "archer academy",
      "archer-academy",
    ],
    color: "#4d73ff",
    accentStrong: "#0000ff",
    accentSoft: "#eef2ff",
    accentTint: "#a9d0ff",
    accentHover: "#3d66ff",
    textHeading: "#0f1f3a",
    textBody: "#1a1a1a",
    textMuted: "#5d6c7b",
    border: "#d9e2f0",
    borderSoft: "#e8eef8",
    surface: "#ffffff",
    surfaceAlt: "#f8faff",
    shellGradientStart: "#f7f9ff",
    shellGradientEnd: "#edf3ff",
    focusRing: "rgba(77, 115, 255, 0.24)",
    logoWordmark: "/archer-wordmark.png",
    logoIcon: "/Icon_Blue.png",
  },
  archer_invest: {
    key: "archer_invest",
    id: "invest",
    label: "Invest",
    aliases: [
      "archer_invest",
      "invest",
      "Invest",
      "Archer Invest",
      "archer invest",
      "archer-invest",
    ],
    color: "#2d50ef",
    accentStrong: "#0000ff",
    accentSoft: "#edf1ff",
    accentTint: "#85aeff",
    accentHover: "#2140d8",
    textHeading: "#111d3c",
    textBody: "#1a1a1a",
    textMuted: "#5d6c7b",
    border: "#d4def2",
    borderSoft: "#e5ecfa",
    surface: "#ffffff",
    surfaceAlt: "#f6f9ff",
    shellGradientStart: "#f6f9ff",
    shellGradientEnd: "#eaf0ff",
    focusRing: "rgba(45, 80, 239, 0.24)",
    logoWordmark: "/archer-wordmark.png",
    logoIcon: "/Icon_Blue.png",
  },
  archer_fund: {
    key: "archer_fund",
    id: "fund",
    label: "Fund",
    aliases: [
      "archer_fund",
      "fund",
      "Fund",
      "Archer Fund",
      "Archer Investment Fund",
      "archer investment fund",
      "archer fund",
      "archer-fund",
    ],
    color: "#1032cf",
    accentStrong: "#006aff",
    accentSoft: "#e7eeff",
    accentTint: "#5695ff",
    accentHover: "#0b27aa",
    textHeading: "#0f1b3a",
    textBody: "#1e1e1f",
    textMuted: "#758696",
    border: "#d5dff5",
    borderSoft: "#e3e9f8",
    surface: "#ffffff",
    surfaceAlt: "#f5f8ff",
    shellGradientStart: "#f7f9ff",
    shellGradientEnd: "#e7eeff",
    focusRing: "rgba(16, 50, 207, 0.24)",
    logoWordmark: "/archer-wordmark.png",
    logoIcon: "/Icon_Blue.png",
  },
};

export const BRAND_CONFIG = BRAND_THEMES;
export const BRAND_KEYS = Object.keys(BRAND_THEMES);

export function resolveBrandKey(rawBrand) {
  const input = String(rawBrand || "").trim().toLowerCase();
  if (!input) return "archer_academy";

  for (const [key, config] of Object.entries(BRAND_THEMES)) {
    if (config.aliases.some((alias) => alias.toLowerCase() === input)) return key;
  }

  return "archer_academy";
}

export function getBrandTheme(rawBrand) {
  return BRAND_THEMES[resolveBrandKey(rawBrand)] || BRAND_THEMES.archer_academy;
}

export function getBrandLabel(rawBrand) {
  return getBrandTheme(rawBrand).label || "Academy";
}

export function getBrandColor(rawBrand) {
  return getBrandTheme(rawBrand).color || BRAND_THEMES.archer_academy.color;
}

export function getBrandAliases(rawBrand) {
  return getBrandTheme(rawBrand).aliases || BRAND_THEMES.archer_academy.aliases;
}

export function getBrandId(rawBrand) {
  return getBrandTheme(rawBrand).id || "academy";
}

export function getBrandLogoWordmark(rawBrand) {
  return getBrandTheme(rawBrand).logoWordmark || "/archer-wordmark.png";
}

export function getBrandLogoIcon(rawBrand) {
  return getBrandTheme(rawBrand).logoIcon || "/Icon_Blue.png";
}
