export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() || "";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || "";

export const BRAND_CONFIG = {
  archer_academy: {
    label: "Academy",
    aliases: ["archer_academy", "Academy", "academy", "Archer Academy", "archer academy"],
    color: "#4d73ff",
  },
  archer_invest: {
    label: "Invest",
    aliases: ["archer_invest", "Invest", "invest", "Archer Invest", "archer invest"],
    color: "#10B981",
  },
  archer_fund: {
    label: "Fund",
    aliases: ["archer_fund", "Fund", "fund", "Archer Fund", "archer fund"],
    color: "#F59E0B",
  },
};

export const BRAND_KEYS = Object.keys(BRAND_CONFIG);

export function resolveBrandKey(rawBrand) {
  const input = String(rawBrand || "").trim().toLowerCase();
  if (!input) return "archer_academy";

  for (const [key, config] of Object.entries(BRAND_CONFIG)) {
    if (config.aliases.some((alias) => alias.toLowerCase() === input)) return key;
  }

  return "archer_academy";
}

export function getBrandLabel(rawBrand) {
  return BRAND_CONFIG[resolveBrandKey(rawBrand)]?.label || "Academy";
}

export function getBrandColor(rawBrand) {
  return BRAND_CONFIG[resolveBrandKey(rawBrand)]?.color || BRAND_CONFIG.archer_academy.color;
}

export function getBrandAliases(rawBrand) {
  return BRAND_CONFIG[resolveBrandKey(rawBrand)]?.aliases || BRAND_CONFIG.archer_academy.aliases;
}
