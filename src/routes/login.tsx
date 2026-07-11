import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { mobileToVendorEmail, APP_NAME } from "@/lib/constants";
import { useServerFn } from "@tanstack/react-start";
import { createSession } from "@/lib/auth.functions";
import { auth } from "@/integrations/firebase/auth";
import { signInWithEmailAndPassword } from "firebase/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const createAuthSession = useServerFn(createSession);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier || !password) return;
    setLoading(true);
    // Accept either email or mobile. If mobile, synthesize the same email
    // used at registration.
    const isMobile = /^[6-9]\d{9}$/.test(identifier.trim());
    const email = isMobile
      ? mobileToVendorEmail(identifier.trim())
      : identifier.trim().toLowerCase();

    try {
      if (!auth) {
        throw new Error("FIREBASE AUTH FAILED: Auth instance is undefined.");
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      await createAuthSession({ data: { idToken } });

      toast.success("Signed in");
      navigate({ to: "/vendor/status" });
    } catch (err: any) {
      toast.error(err.message || "Error signing in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Vendor Login</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Access your {APP_NAME} vendor application.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="rounded-[22px] border bg-white p-6 shadow-[var(--shadow-card)]"
      >
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Mobile or Email</Label>
            <Input
              className="mt-1.5"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="10-digit mobile or your email"
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
      <div className="text-center text-sm text-muted-foreground">
        New vendor?{" "}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Register here
        </Link>
      </div>
    </div>
  );
}
