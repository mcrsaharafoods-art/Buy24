import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import { LogOut } from "lucide-react";
import { getPublicSettings } from "@/lib/settings.functions";
import { auth } from "@/integrations/firebase/auth";
import { useServerFn } from "@tanstack/react-start";
import { removeSession } from "@/lib/auth.functions";

export function SiteHeader() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const removeAuthSession = useServerFn(removeSession);

  const { data: settings } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => getPublicSettings(),
    staleTime: 60_000,
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user: any) => {
      setEmail(user?.email ?? null);
    });
    return () => unsubscribe();
  }, [router]);

  async function handleSignOut() {
    await auth.signOut();
    await removeAuthSession();
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
