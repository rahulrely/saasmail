import { auth } from "@/auth";
import { TemplateManager } from "@/components/template-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";

export default async function TemplatesPage() {
  const session = await auth();
  const userId = session!.user.id;
  const templates = await db.emailTemplate.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Templates</p>
        <h1 className="mt-2 text-3xl font-semibold">Compose reusable transactional content</h1>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Template editor</CardTitle>
          <CardDescription>Build HTML templates with JSON variables and duplicate them for experiments.</CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateManager
            templates={templates.map((template) => ({
              ...template,
              createdAt: template.createdAt.toISOString(),
              variablesJson: template.variablesJson as Record<string, unknown> | null,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
