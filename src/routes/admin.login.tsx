import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { bootstrapAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const bootstrap = useServerFn(bootstrapAdmin);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // Idempotent: creates the fixed super-admin account on first login.
      await bootstrap({});
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      toast.success("Welcome, admin");
      navigate({ to: "/admin/applications" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
      <div className="text-center">
        <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-primary/10">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Super Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to review vendor applications.</p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="rounded-[22px] border bg-white p-6 shadow-[var(--shadow-card)]"
      >
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Admin Email</Label>
            <Input
              className="mt-1.5"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Password</Label>
            <Input
              className="mt-1.5"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Login
          </Button>
        </div>
      </form>
    </div>
  );
}
