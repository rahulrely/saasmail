import Link from "next/link";
import { ArrowRight, Inbox, Mail, ShieldCheck } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">SaaSMail</p>
          <h1 className="text-3xl font-semibold">Bring your own Resend infrastructure.</h1>
        </div>
        <ThemeToggle />
      </header>

      <section className="mt-16 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="inline-flex rounded-full bg-secondary px-4 py-2 text-sm text-secondary-foreground">
            Secure multi-tenant sending, inbound capture, templates, and analytics
          </p>
          <h2 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight">
            A production-style email workspace for SaaS teams shipping on Resend.
          </h2>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Users connect their own verified domain and API key, manage templates, send transactional email,
            receive inbound events, and monitor delivery logs from one clean dashboard.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/register">
              <Button size="lg">
                Create workspace <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Sign in
              </Button>
            </Link>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Platform highlights</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-2xl bg-secondary p-4">
              <Mail className="h-5 w-5 text-primary" />
              <p className="mt-3 font-medium">Dynamic send API</p>
              <p className="text-sm text-muted-foreground">Template-powered or raw HTML sends with per-user credentials.</p>
            </div>
            <div className="rounded-2xl bg-secondary p-4">
              <Inbox className="h-5 w-5 text-primary" />
              <p className="mt-3 font-medium">Inbound webhooks</p>
              <p className="text-sm text-muted-foreground">Capture payloads, headers, attachments, and delivery events safely.</p>
            </div>
            <div className="rounded-2xl bg-secondary p-4">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <p className="mt-3 font-medium">Secure by default</p>
              <p className="text-sm text-muted-foreground">Encrypted API keys, Auth.js sessions, Zod validation, and tenant-safe queries.</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
