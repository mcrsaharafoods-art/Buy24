import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import { LogOut } from "lucide-react";
import { getPublicSettings } from "@/lib/settings.functions";

export function SiteHeader() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  const { data: settings } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => getPublicSettings(),
    staleTime: 60_000,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setEmail(session?.user?.email ?? null);
        router.invalidate();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          {settings?.favicon_data_url ? (
            <img
              src={settings.favicon_data_url}
              alt="Logo"
              className="h-9 w-9 rounded-[12px] object-contain"
            />
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded-[12px] bg-primary text-primary-foreground font-semibold">
              B
            </div>
          )}
          <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
        </Link>
        <div className="flex items-center gap-2">
          {email ? (
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
