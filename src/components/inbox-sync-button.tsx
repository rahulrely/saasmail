"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function InboxSyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function syncInbox() {
    setLoading(true);
    setMessage("");
    setError("");

    const response = await fetch("/api/inbox/sync", { method: "POST" });
    const data = (await response.json()) as { message?: string; error?: string };
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to sync inbox.");
      return;
    }

    setMessage(data.message ?? "Inbox synced.");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <Button type="button" variant="outline" onClick={syncInbox} disabled={loading}>
        {loading ? "Syncing..." : "Fetch received emails"}
      </Button>
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
