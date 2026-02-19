import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Supabase configuratie ontbreekt. Zet VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
