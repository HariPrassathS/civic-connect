import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-6">
        <SearchX className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Page Not Found</h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/">
        <Button className="mt-6">Go Home</Button>
      </Link>
      <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
        <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-blue-600 to-cyan-500">
          <Shield className="h-3 w-3 text-white" />
        </div>
        CivicConnect TN
      </div>
    </div>
  );
}
