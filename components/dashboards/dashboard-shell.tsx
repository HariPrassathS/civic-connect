"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/shared/notification-bell";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
}

interface DashboardShellProps {
  children: React.ReactNode;
  roleName: string;
  navItems: NavItem[];
}

export function DashboardShell({
  children,
  roleName,
  navItems,
}: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      {/* ── Mobile Header ───────────────────────── */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border/40 bg-background/80 px-4 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-cyan-500">
            <Shield className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold">{roleName}</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <form action={logout}>
            <Button type="submit" variant="ghost" size="icon-sm">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </header>

      {/* ── Desktop Sidebar ──────────────────────── */}
      <aside className="hidden w-64 flex-col border-r border-border/40 bg-card/30 p-4 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="block text-sm font-bold tracking-tight">
              CivicConnect
            </span>
            <span className="block text-xs text-muted-foreground">
              {roleName} Dashboard
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-500/10 text-blue-500"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.icon}
                {item.title}
              </Link>
            );
          })}
        </nav>

        <form action={logout} className="mt-auto">
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </form>
      </aside>

      {/* ── Main Content ─────────────────────────── */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Nav ────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border/40 bg-background/95 backdrop-blur md:hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-full h-full",
                isActive ? "text-blue-500" : "text-muted-foreground"
              )}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
