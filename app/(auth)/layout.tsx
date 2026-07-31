import { Shield } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      {/* Gradient orbs */}
      <div className="pointer-events-none fixed -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-blue-600/8 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-20 right-0 h-[400px] w-[400px] rounded-full bg-cyan-500/8 blur-3xl" />

      {/* Logo */}
      <div className="relative z-10 mb-8 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight">
          Civic<span className="text-blue-500">Connect</span>
        </span>
      </div>

      {/* Auth card */}
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>

      {/* Footer */}
      <p className="relative z-10 mt-8 text-center text-xs text-muted-foreground">
        Smart Civic Issue Management — Transparent &amp; Accountable
      </p>
    </div>
  );
}
