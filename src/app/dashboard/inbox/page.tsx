import { auth } from "@/auth";
import { InboxSyncButton } from "@/components/inbox-sync-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export default async function InboxPage() {
  const session = await auth();
  const userId = session!.user.id;
  const items = await db.receivedEmail.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Inbox</p>
        <h1 className="mt-2 text-3xl font-semibold">Inbound email stream</h1>
        <div className="mt-4">
          <InboxSyncButton />
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Received messages</CardTitle>
          <CardDescription>Incoming payloads, attachment metadata, and captured content.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-3xl border border-border/70 p-5">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-semibold">{item.subject || "(no subject)"}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.fromEmail} → {item.toEmail}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">{formatDate(item.receivedAt ?? item.createdAt)}</p>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{item.textBody ?? "No plain text body provided."}</p>
              <pre className="mt-4 overflow-x-auto rounded-2xl bg-secondary p-4 text-xs">
                {JSON.stringify(item.attachmentsMeta ?? [], null, 2)}
              </pre>
            </div>
          ))}
          {!items.length ? <p className="text-sm text-muted-foreground">No inbound emails received yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
