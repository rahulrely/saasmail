import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export default async function LogsPage() {
  const session = await auth();
  const userId = session!.user.id;
  const logs = await db.sentEmailLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Logs</p>
        <h1 className="mt-2 text-3xl font-semibold">Sent email history</h1>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Delivery log</CardTitle>
          <CardDescription>Status, errors, and timestamps for outbound messages.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Error</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-border/60">
                  <td className="px-4 py-3">{log.recipient}</td>
                  <td className="px-4 py-3">{log.subject}</td>
                  <td className="px-4 py-3">
                    <Badge>{log.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{log.errorMessage ?? "—"}</td>
                  <td className="px-4 py-3">{formatDate(log.sentAt ?? log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
