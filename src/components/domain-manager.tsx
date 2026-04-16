"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DomainRecord = {
  id: string;
  name: string;
  status: string;
  region: string | null;
  lastSyncedAt: string | null;
  recordsJson: Array<{
    record?: string;
    name?: string;
    type?: string;
    value?: string;
    status?: string;
  }> | null;
};

export function DomainManager({ domains }: { domains: DomainRecord[] }) {
  const [items, setItems] = useState(domains);
  const [domainName, setDomainName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function createDomain() {
    setLoading(true);
    const response = await fetch("/api/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: domainName }),
    });
    const data = (await response.json()) as { item?: DomainRecord; error?: string };
    setLoading(false);
    if (!response.ok || !data.item) {
      setMessage(data.error ?? "Unable to add domain");
      return;
    }
    setItems((current) => {
      const exists = current.some((item) => item.name.toLowerCase() === data.item!.name.toLowerCase());
      return exists ? current.map((item) => (item.name.toLowerCase() === data.item!.name.toLowerCase() ? data.item! : item)) : [data.item!, ...current];
    });
    setDomainName("");
    setMessage("Domain added. Update DNS and sync status when ready.");
  }

  async function syncDomain(id: string) {
    const response = await fetch(`/api/domains/${id}/sync`, { method: "POST" });
    const data = (await response.json()) as { item?: DomainRecord; error?: string };
    if (!response.ok || !data.item) {
      setMessage(data.error ?? "Unable to sync domain");
      return;
    }
    setItems((current) => current.map((item) => (item.id === id ? data.item! : item)));
    setMessage("Domain status refreshed.");
  }

  async function fetchExistingDomains() {
    setLoading(true);
    const response = await fetch("/api/domains/import", { method: "POST" });
    const data = (await response.json()) as { items?: DomainRecord[]; error?: string; message?: string };
    setLoading(false);
    if (!response.ok || !data.items) {
      setMessage(data.error ?? "Unable to fetch existing domains");
      return;
    }

    setItems(data.items);
    setMessage(data.message ?? "Fetched existing Resend domains.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-border/70 p-6 md:flex-row md:items-center">
        <Input
          className="md:w-[65%] md:flex-none"
          placeholder="example.com"
          value={domainName}
          onChange={(event) => setDomainName(event.target.value)}
        />
        <Button className="whitespace-nowrap px-6" type="button" onClick={createDomain} disabled={loading}>
          {loading ? "Working..." : "Add domain"}
        </Button>
        <Button
          className="whitespace-nowrap px-6"
          type="button"
          variant="outline"
          onClick={fetchExistingDomains}
          disabled={loading}
        >
          Fetch existing domains
        </Button>
      </div>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <div className="space-y-4">
        {items.map((domain) => (
          <div key={domain.id} className="rounded-3xl border border-border/70 p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold">{domain.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Status: {domain.status} {domain.region ? `• ${domain.region}` : ""}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => syncDomain(domain.id)}>
                Sync verification
              </Button>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-border/70">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Host</th>
                    <th className="px-4 py-3">Value</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(domain.recordsJson ?? []).map((record, index) => (
                    <tr key={`${domain.id}-${index}`} className="border-t border-border/60">
                      <td className="px-4 py-3">{record.type ?? record.record ?? "—"}</td>
                      <td className="px-4 py-3">{record.name ?? "—"}</td>
                      <td className="px-4 py-3 break-all">{record.value ?? "—"}</td>
                      <td className="px-4 py-3">{record.status ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
