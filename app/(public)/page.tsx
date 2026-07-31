import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Shield,
  Clock,
  BarChart3,
  MapPin,
  Users,
  Zap,
  Map,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Navbar ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              CivicConnect <span className="text-blue-500">TN</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/nearby">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Map className="h-3.5 w-3.5" />
                Nearby
              </Button>
            </Link>
            <Link href="/about">
              <Button variant="ghost" size="sm">
                About
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Login
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Hero ───────────────────────────────────────── */}
      <main className="flex flex-1 flex-col">
        <section className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
          {/* Gradient orbs */}
          <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 right-0 h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-3xl text-center">
            {/* Badge */}
            <div className="mx-auto mb-6 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-blue-500" />
              AI-Powered · Transparent · Accountable
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Your Tamil Nadu.{" "}
              <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
                Your Voice.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Report civic issues, track resolution in real-time, and hold every
              level — from field worker to Chief Minister — accountable with
              time-bound SLAs and automatic escalation.
            </p>

            {/* CTA */}
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/submit-issue">
                <Button
                  size="lg"
                  className="h-12 gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-8 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-shadow hover:shadow-xl hover:shadow-blue-500/30"
                >
                  Submit Issue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-xl px-8 text-base"
                >
                  Track an Issue
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────── */}
        <section className="border-t border-border/40 bg-muted/30 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-12 text-center text-2xl font-bold tracking-tight sm:text-3xl">
              How it works
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={<MapPin className="h-5 w-5" />}
                title="Location-aware Reporting"
                description="Pin your issue on the map. We auto-assign the nearest field worker based on GPS coordinates."
              />
              <FeatureCard
                icon={<Clock className="h-5 w-5" />}
                title="8-Level Escalation"
                description="Missed SLA? Issues escalate automatically — from Field Worker all the way to the Chief Minister."
              />
              <FeatureCard
                icon={<BarChart3 className="h-5 w-5" />}
                title="Real-time Dashboards"
                description="Every role gets a live dashboard. Track issues, measure performance, and spot trends instantly."
              />
              <FeatureCard
                icon={<Shield className="h-5 w-5" />}
                title="AI Categorization"
                description="Smart classification detects issue type, urgency, and duplicate reports automatically."
              />
              <FeatureCard
                icon={<Users className="h-5 w-5" />}
                title="Full Transparency"
                description="Public issues are visible to all citizens. Private issues stay confidential between you and officials."
              />
              <FeatureCard
                icon={<Zap className="h-5 w-5" />}
                title="Instant Notifications"
                description="In-app, email, SMS, and push notifications keep everyone updated at every step."
              />
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="border-t border-border/40 px-4 py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Civic Connect. Built for transparent governance.</p>
      </footer>
    </div>
  );
}

/* ─── Feature Card ─────────────────────────────────────── */
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm transition-all hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 transition-colors group-hover:bg-blue-500/20">
        {icon}
      </div>
      <h3 className="mb-2 font-semibold tracking-tight">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
