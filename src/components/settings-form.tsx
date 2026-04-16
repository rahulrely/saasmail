"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resendConfigSchema, type ResendConfigInput } from "@/lib/schemas";

export function ResendSettingsForm({ defaultValues }: { defaultValues?: Partial<ResendConfigInput> }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { register, handleSubmit, formState } = useForm<ResendConfigInput>({
    resolver: zodResolver(resendConfigSchema),
    defaultValues: {
      resendApiKey: "",
      verifiedDomain: defaultValues?.verifiedDomain ?? "",
      productName: defaultValues?.productName ?? "",
      defaultFromEmail: defaultValues?.defaultFromEmail ?? "",
    },
  });

  async function onSubmit(values: ResendConfigInput) {
    setMessage("");
    setError("");

    const response = await fetch("/api/settings/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const data = (await response.json()) as { error?: string; message?: string };
    if (!response.ok) {
      setError(data.error ?? "Unable to save settings");
      return;
    }

    setMessage(data.message ?? "Settings saved.");
  }

  async function sendTestEmail() {
    setMessage("");
    setError("");
    const recipient = window.prompt("Send a test email to:");
    if (!recipient) return;

    const response = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient,
        subject: "Test email from SaaSMail",
        rawHtml: "<h1>It works</h1><p>Your Resend connection is ready.</p>",
      }),
    });

    const data = (await response.json()) as { error?: string; message?: string };
    if (!response.ok) {
      setError(data.error ?? "Unable to send test email.");
      return;
    }

    setMessage(data.message ?? "Test email queued.");
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <Input placeholder="re_xxxxxxxxx" {...register("resendApiKey")} />
      <Input placeholder="mail.yourdomain.com" {...register("verifiedDomain")} />
      <Input placeholder="Acme Product" {...register("productName")} />
      <Input placeholder="hello@mail.yourdomain.com" type="email" {...register("defaultFromEmail")} />
      <div className="flex flex-wrap gap-3">
        <Button disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Saving..." : "Save Resend settings"}
        </Button>
        <Button type="button" variant="outline" onClick={sendTestEmail}>
          Send test email
        </Button>
      </div>
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
