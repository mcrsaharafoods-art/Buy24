import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, ShieldCheck, Clock } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-12 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center rounded-full border bg-white px-3 py-1 text-xs font-medium text-muted-foreground shadow-[var(--shadow-soft)]">
            Vendor Registration Portal
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
            Sell on {APP_NAME}. <br className="hidden sm:inline" />
            Reach customers across India.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Complete a simple 7-step application to register your business. Our team reviews every
            submission and approves qualified sellers.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/register">
                Start registration <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">Existing vendor? Login</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Steps overview */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-[22px] border bg-white p-8 shadow-[var(--shadow-card)]">
          <h2 className="text-xl font-semibold">What you'll need</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Have these documents ready before you start.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Aadhaar & PAN",
              "Shop photo",
              "Cancelled cheque / passbook",
              "Bank account details",
              "GSTIN & FSSAI (if applicable)",
              "Business address",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "Secure",
              body: "Encrypted document uploads with role-based access.",
            },
            {
              icon: Clock,
              title: "Fast review",
              body: "Track your application status any time after login.",
            },
            {
              icon: CheckCircle2,
              title: "Straightforward",
              body: "7 short steps. Save your OTP verification and continue.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-[18px] border bg-white p-6 shadow-[var(--shadow-soft)]"
            >
              <f.icon className="h-5 w-5 text-primary" />
              <div className="mt-3 font-semibold">{f.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
