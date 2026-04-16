import { startOfDay } from "date-fns";

import { auth } from "@/auth";
import { SendEmailForm } from "@/components/send-email-form";
import { StatsCard } from "@/components/stats-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;
  const today = startOfDay(new Date());

  const [sentToday, failed, receivedToday, recentLogs, templates] = await Promise.all([
    db.sentEmailLog.count({ where: { userId, createdAt: { gte: today } } }),
    db.sentEmailLog.count({ where: { userId, status: "FAILED" } }),
    db.receivedEmail.count({ where: { userId, createdAt: { gte: today } } }),
    db.sentEmailLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.emailTemplate.findMany({
      where: { userId },
      select: { id: true, name: true, subject: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Overview</p>
        <h1 className="mt-2 text-3xl font-semibold">Email operations at a glance</h1>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatsCard label="Sent today" value={sentToday} hint="Live sending volume for the current day" />
        <StatsCard label="Failed" value={failed} hint="Emails that need operator attention" />
        <StatsCard label="Received today" value={receivedToday} hint="Inbound traffic captured by webhooks" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Send email</CardTitle>
        </CardHeader>
        <CardContent>
          <SendEmailForm templates={templates} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentLogs.map((log) => (
            <div key={log.id} className="flex flex-col gap-2 rounded-2xl border border-border/70 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">{log.subject}</p>
                <p className="text-sm text-muted-foreground">{log.recipient}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge>{log.status}</Badge>
                <span className="text-sm text-muted-foreground">{formatDate(log.createdAt)}</span>
              </div>
            </div>
          ))}
          {!recentLogs.length ? <p className="text-sm text-muted-foreground">No email activity yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
