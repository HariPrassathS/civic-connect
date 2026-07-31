import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  ArrowLeft,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";

const ESCALATION_CHAIN = [
  { level: 1, role: "Field Worker", sla: "24 hours" },
  { level: 2, role: "Zonal Officer", sla: "24 hours" },
  { level: 3, role: "Department Head", sla: "48 hours" },
  { level: 4, role: "Regional Deputy Commissioner", sla: "72 hours" },
  { level: 5, role: "GCC / Municipal Commissioner", sla: "Manual" },
  { level: 6, role: "District Collector", sla: "Manual" },
  { level: 7, role: "Chief Secretary (Tamil Nadu)", sla: "Manual" },
  { level: 8, role: "Chief Minister (Tamil Nadu)", sla: "Final" },
];

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
          <Link href="/">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-cyan-500">
              <Shield className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold">About CivicConnect TN</span>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        {/* Hero */}
        <section className="mb-12 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            வெளிப்படையான. பொறுப்பான.{" "}
            <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
              AI-தொழில்நுட்பம்.
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            சிவிக்கணெக்ட் என்பது தமிழ்நாடு அரசின் புதிய ஸ்மார்ட் குறைதீர்க்கும் தளம். 
            ஒவ்வொரு புகாரும் வெளிப்படைத்தன்மையுடன் கண்காணிக்கப்பட்டு, சரியான நேரத்தில் தீர்க்கப்படுவதை உறுதி செய்கிறது — குடிமக்களிலிருந்து முதலமைச்சர் வரை.
          </p>
        </section>

        {/* How It Works */}
        <section className="mb-12">
          <h2 className="mb-6 text-xl font-bold">How It Works</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <AlertTriangle className="h-5 w-5 text-blue-500" />
                </div>
                <CardTitle className="text-base">1. Report</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Citizens submit issues with photos, location, and category.
                  AI auto-categorizes and scores priority.
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                </div>
                <CardTitle className="text-base">2. Track & Escalate</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Complaints are auto-assigned to the nearest team. Missed SLAs
                  trigger automatic escalation up the chain.
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <CardTitle className="text-base">3. Resolve & Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Citizens verify the fix and rate the resolution. Rejected
                  fixes go back for rework — no closing without consent.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Escalation Chain */}
        <section className="mb-12">
          <h2 className="mb-2 text-xl font-bold">
            8-Level Escalation Guarantee
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Every unresolved complaint automatically escalates up the chain.
            No issue can be buried or forgotten.
          </p>
          <div className="space-y-2">
            {ESCALATION_CHAIN.map((item) => (
              <div
                key={item.level}
                className="flex items-center gap-4 rounded-lg border p-3"
              >
                <Badge
                  variant={item.level <= 4 ? "default" : "secondary"}
                  className="h-8 w-8 shrink-0 items-center justify-center rounded-full p-0 text-xs"
                >
                  L{item.level}
                </Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.role}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {item.sla}
                </div>
                {item.level < 8 && (
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Platform Values */}
        <section className="mb-12">
          <h2 className="mb-6 text-xl font-bold">Our Pillars</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="mb-1 font-semibold">🛡️ Transparency</h3>
              <p className="text-sm text-muted-foreground">
                Every status change, every escalation, every SLA deadline is
                visible to the citizen. No hidden processes.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="mb-1 font-semibold">⏱️ Accountability</h3>
              <p className="text-sm text-muted-foreground">
                Time-bound resolution at every level. Auto-escalation on missed
                deadlines ensures no complaint is stalled.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="mb-1 font-semibold">🤖 AI-Powered</h3>
              <p className="text-sm text-muted-foreground">
                Smart categorization, priority scoring, duplicate detection,
                and trend analysis powered by AI.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="mb-1 font-semibold">👥 Citizen-First</h3>
              <p className="text-sm text-muted-foreground">
                Citizens verify resolutions and rate outcomes. No issue is
                closed without the reporter&apos;s consent.
              </p>
            </div>
          </div>
        </section>

        <div className="text-center">
          <Link href="/submit-issue">
            <Button className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-500">
              Report an Issue Now
            </Button>
          </Link>
        </div>
      </main>

      <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Government of Tamil Nadu. Built for the people.
      </footer>
    </div>
  );
}
