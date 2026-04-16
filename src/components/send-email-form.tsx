"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type TemplateOption = {
  id: string;
  name: string;
  subject: string;
};

export function SendEmailForm({ templates }: { templates: TemplateOption[] }) {
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [mode, setMode] = useState<"html" | "text">("html");
  const [rawHtml, setRawHtml] = useState("<h1>Hello {{name}}</h1><p>Welcome to {{company}}</p>");
  const [plainText, setPlainText] = useState("Hello {{name}},\n\nWelcome to {{company}}.");
  const [variables, setVariables] = useState('{"name":"Ava","company":"Syntx AI"}');
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    let parsedVariables: Record<string, string> | undefined;
    if (variables.trim()) {
      try {
        parsedVariables = JSON.parse(variables) as Record<string, string>;
      } catch {
        setLoading(false);
        setError("Variables must be valid JSON.");
        return;
      }
    }

    const response = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient,
        subject: subject || undefined,
        templateId: templateId || undefined,
        rawHtml: templateId || mode === "text" ? undefined : rawHtml,
        plainText: templateId || mode === "html" ? undefined : plainText,
        variables: parsedVariables,
      }),
    });

    const data = (await response.json()) as { message?: string; error?: string };
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to send email.");
      return;
    }

    setMessage(data.message ?? "Email sent.");
    setRecipient("");
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <Input placeholder="recipient@example.com" type="email" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
      <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <select
        className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
        value={templateId}
        onChange={(e) => setTemplateId(e.target.value)}
      >
        <option value="">Custom email</option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
          </option>
        ))}
      </select>
      {!templateId ? (
        <>
          <div className="flex gap-2">
            <Button type="button" variant={mode === "html" ? "default" : "outline"} onClick={() => setMode("html")}>
              HTML
            </Button>
            <Button type="button" variant={mode === "text" ? "default" : "outline"} onClick={() => setMode("text")}>
              Plain Text
            </Button>
          </div>
          {mode === "html" ? (
            <Textarea className="min-h-[180px]" value={rawHtml} onChange={(e) => setRawHtml(e.target.value)} />
          ) : (
            <Textarea className="min-h-[180px]" value={plainText} onChange={(e) => setPlainText(e.target.value)} />
          )}
        </>
      ) : null}
      <Textarea className="min-h-[120px]" value={variables} onChange={(e) => setVariables(e.target.value)} />
      <Button disabled={loading}>{loading ? "Sending..." : "Send email"}</Button>
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
