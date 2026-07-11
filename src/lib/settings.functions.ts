/**
 * Public read for site-wide settings (favicon + support email).
 * Uses the publishable-key server client and the `Anyone can read settings`
 * RLS policy.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const getPublicSettings = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await supabase
    .from("system_settings")
    .select("support_email, favicon_data_url")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    support_email: data?.support_email ?? "support@buy24us.com",
    favicon_data_url: data?.favicon_data_url ?? null,
  };
});
