import Link from "next/link";
import { Shield, LogOut, Plus, MapPin, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/(auth)/actions";
import { NotificationBell } from "@/components/shared/notification-bell";

export default function CitizenDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/dashboard/citizen" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-cyan-500">
              <Shield className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">My Issues</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/citizen/community"
              className="inline-flex h-7 items-center gap-1.5 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium transition-all hover:bg-muted hover:text-foreground"
            >
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Community</span>
            </Link>
            <Link
              href="/nearby"
              className="inline-flex h-7 items-center gap-1.5 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium transition-all hover:bg-muted hover:text-foreground"
            >
              <MapPin className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nearby</span>
            </Link>
            <Link
              href="/submit-issue"
              className="inline-flex h-7 items-center gap-1.5 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium transition-all hover:bg-muted hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Issue</span>
            </Link>
            
            <Link
              href="/dashboard/citizen/profile"
              className="inline-flex h-7 items-center gap-1.5 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium transition-all hover:bg-muted hover:text-foreground"
            >
              <User className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Profile</span>
            </Link>
            
            <NotificationBell />

            <form action={logout}>
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
