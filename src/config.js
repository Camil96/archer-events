export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() || "";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || "";

// Brandbook + live-site aligned palette anchors:
// - Core palette: #000000, #2d3036, #a6b3c0, #f4f4f4, #0000ff
// - UI range: #4d73ff, #85aeff, #a9d0ff
export const BRAND_THEMES = {
  archer_academy: {
    key: "archer_academy",
    id: "academy",
    dbValue: "Academy",
    label: "Academy",
    fullLabel: "Archer Academy",
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
    dbValue: "Invest",
    label: "Invest",
    fullLabel: "Archer Invest",
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
    dbValue: "Fund",
    label: "Investment Fund",
    fullLabel: "Archer Investment Fund",
    aliases: [
      "archer_fund",
      "fund",
      "Fund",
      "Investment Fund",
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

export function getBrandFullLabel(rawBrand) {
  return getBrandTheme(rawBrand).fullLabel || "Archer Academy";
}

export function getBrandDbValue(rawBrand) {
  return getBrandTheme(rawBrand).dbValue || "Academy";
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

function clampChannel(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(255, Math.round(numeric)));
}

function hexToRgb(hexColor) {
  const clean = String(hexColor || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
  ];
}

function rgbToHex([r, g, b]) {
  return `#${[r, g, b]
    .map((channel) => clampChannel(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function normalizeHexColor(value) {
  const clean = String(value || "").trim().replace("#", "");
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return `#${clean
      .split("")
      .map((char) => `${char}${char}`)
      .join("")
      .toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) return `#${clean.toLowerCase()}`;
  return null;
}

export function mixHexColors(hexA, hexB, ratioA = 0.5) {
  const colorA = hexToRgb(normalizeHexColor(hexA));
  const colorB = hexToRgb(normalizeHexColor(hexB));
  if (!colorA && !colorB) return "#4d73ff";
  if (!colorA) return normalizeHexColor(hexB);
  if (!colorB) return normalizeHexColor(hexA);

  const ratio = Math.max(0, Math.min(1, Number(ratioA)));
  const mixed = [0, 1, 2].map((idx) => colorA[idx] * ratio + colorB[idx] * (1 - ratio));
  return rgbToHex(mixed);
}

export function darkenHexColor(hexColor, amount = 0.15) {
  const ratio = 1 - Math.max(0, Math.min(1, Number(amount)));
  return mixHexColors(hexColor, "#000000", ratio);
}

export function hexToRgbString(hexColor) {
  const rgb = hexToRgb(normalizeHexColor(hexColor));
  if (!rgb) return "77, 115, 255";
  return `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`;
}

export function computeBrandCssVariables(rawBrand, options = {}) {
  const theme = getBrandTheme(rawBrand);
  const accent = normalizeHexColor(options.accentColor) || normalizeHexColor(theme.color) || "#4d73ff";
  const accentHover = darkenHexColor(accent, 0.14);
  const accentStrong = mixHexColors(accent, "#000000", 0.86);
  const accentSoft = mixHexColors(accent, "#ffffff", 0.1);
  const accentTint = mixHexColors(accent, "#ffffff", 0.28);
  const brandBorder = mixHexColors(accent, "#f4f4f4", 0.22);
  const brandBorderSoft = mixHexColors(accent, "#f4f4f4", 0.12);
  const brandBorderStrong = mixHexColors(accent, "#f4f4f4", 0.32);
  const surfaceAlt = mixHexColors(accent, "#ffffff", 0.06);
  const shellStart = mixHexColors(accent, "#ffffff", 0.08);
  const shellEnd = mixHexColors(accent, "#f4f4f4", 0.18);
  const accentRgb = hexToRgbString(accent);

  return {
    "--brand-accent": accent,
    "--brand-accent-hover": accentHover,
    "--brand-accent-strong": accentStrong,
    "--brand-accent-soft": accentSoft,
    "--brand-accent-tint": accentTint,
    "--brand-accent-rgb": accentRgb,
    "--brand-border": brandBorder,
    "--brand-border-soft": brandBorderSoft,
    "--brand-border-strong": brandBorderStrong,
    "--brand-surface": theme.surface || "#ffffff",
    "--brand-surface-alt": surfaceAlt,
    "--brand-shell-start": shellStart,
    "--brand-shell-end": shellEnd,
    "--brand-text-heading": theme.textHeading || "#0f1f3a",
    "--brand-text-body": theme.textBody || "#1a1a1a",
    "--brand-text-muted": theme.textMuted || "#5d6c7b",
    "--focus-ring": `rgba(${accentRgb}, 0.22)`,
  };
}

export function cssVarsToInlineStyle(cssVars) {
  return Object.entries(cssVars || {})
    .filter(([key, value]) => key && value !== null && value !== undefined && value !== "")
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
}
