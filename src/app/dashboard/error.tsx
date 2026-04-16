"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-md space-y-4 rounded-3xl border border-border/70 bg-card p-8">
      <h2 className="text-2xl font-semibold">Dashboard error</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Reload section</Button>
    </div>
  );
}
