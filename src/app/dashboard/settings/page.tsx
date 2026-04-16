import { auth } from "@/auth";
import { DomainManager } from "@/components/domain-manager";
import { ResendSettingsForm } from "@/components/settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";

export default async function SettingsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [config, domains] = await Promise.all([
    db.emailProviderConfig.findUnique({ where: { userId } }),
    db.domain.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold">Connect your Resend workspace</h1>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Resend configuration</CardTitle>
          <CardDescription>Keys are encrypted at rest and only used inside server routes and services.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResendSettingsForm
            defaultValues={{
              verifiedDomain: config?.verifiedDomain,
              productName: config?.productName,
              defaultFromEmail: config?.defaultFromEmail,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Domain management</CardTitle>
          <CardDescription>Add a domain, copy the DNS records from Resend, then sync status.</CardDescription>
        </CardHeader>
        <CardContent>
          <DomainManager
            domains={domains.map((domain) => ({
              ...domain,
              lastSyncedAt: domain.lastSyncedAt?.toISOString() ?? null,
              recordsJson: Array.isArray(domain.recordsJson) ? (domain.recordsJson as never[]) : null,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
