"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { templateSchema, type TemplateInput } from "@/lib/schemas";

type TemplateRecord = TemplateInput & {
  id: string;
  createdAt: string;
};

export function TemplateManager({ templates }: { templates: TemplateRecord[] }) {
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [items, setItems] = useState(templates);
  const [variablesText, setVariablesText] = useState('{"name":"Ava","otp":"938221","company":"Acme"}');
  const { register, handleSubmit, reset, setValue, formState } = useForm<TemplateInput>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      subject: "",
      htmlContent:
        "<div style='font-family:Arial,sans-serif'><h1>Hello {{name}}</h1><p>Your OTP is <strong>{{otp}}</strong>.</p><p>- {{company}}</p></div>",
      variablesJson: {
        name: "Ava",
        otp: "938221",
        company: "Acme",
      },
    },
  });

  useEffect(() => {
    register("variablesJson");
  }, [register]);

  async function save(values: TemplateInput) {
    setMessage("");
    const method = editingId ? "PATCH" : "POST";
    const url = editingId ? `/api/templates/${editingId}` : "/api/templates";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const data = (await response.json()) as { item?: TemplateRecord; error?: string };
    if (!response.ok || !data.item) {
      setMessage(data.error ?? "Unable to save template");
      return;
    }

    const next = editingId
      ? items.map((item) => (item.id === editingId ? data.item! : item))
      : [data.item, ...items];
    setItems(next);
    setEditingId(null);
    reset();
    setVariablesText('{"name":"Ava","otp":"938221","company":"Acme"}');
    setMessage("Template saved.");
  }

  async function remove(id: string) {
    const response = await fetch(`/api/templates/${id}`, { method: "DELETE" });
    if (!response.ok) return;
    setItems((current) => current.filter((item) => item.id !== id));
  }

  async function duplicate(template: TemplateRecord) {
    await save({
      name: `${template.name} Copy`,
      subject: template.subject,
      htmlContent: template.htmlContent,
      variablesJson: template.variablesJson,
    });
  }

  return (
    <div className="space-y-6">
      <form className="space-y-4 rounded-3xl border border-border/70 p-6" onSubmit={handleSubmit(save)}>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">{editingId ? "Edit template" : "Create template"}</h3>
          <p className="text-sm text-muted-foreground">
            Add the template details here, then manage created templates in the list below.
          </p>
        </div>
        <Input placeholder="Template name" {...register("name")} />
        <Input placeholder="Subject line" {...register("subject")} />
        <Textarea placeholder="Email HTML" className="min-h-[260px]" {...register("htmlContent")} />
        <Textarea
          placeholder='{"name":"Ava","otp":"938221","company":"Acme"}'
          className="min-h-[120px]"
          value={variablesText}
          onChange={(event) => {
            const value = event.target.value;
            setVariablesText(value);
            try {
              setValue("variablesJson", value ? JSON.parse(value) : null, { shouldValidate: true });
            } catch {
              setValue("variablesJson", null, { shouldValidate: true });
            }
          }}
        />
        <div className="flex flex-wrap gap-3">
          <Button disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Saving..." : editingId ? "Update template" : "Create template"}
          </Button>
          {editingId ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingId(null);
                reset();
                setVariablesText('{"name":"Ava","otp":"938221","company":"Acme"}');
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          Supports variables like <code>{"{{name}}"}</code>, <code>{"{{otp}}"}</code>, and <code>{"{{company}}"}</code>.
        </p>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </form>

      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Created templates</h3>
          <p className="text-sm text-muted-foreground">All saved templates are listed below for quick edit, duplicate, or delete actions.</p>
        </div>
        {!items.length ? <div className="rounded-3xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">No templates created yet.</div> : null}
        {items.map((template) => (
          <div key={template.id} className="rounded-3xl border border-border/70 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">{template.name}</h3>
                <p className="text-sm text-muted-foreground">{template.subject}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingId(template.id);
                    reset({
                      name: template.name,
                      subject: template.subject,
                      htmlContent: template.htmlContent,
                      variablesJson: template.variablesJson,
                    });
                    setVariablesText(JSON.stringify(template.variablesJson ?? {}, null, 2));
                  }}
                >
                  Edit
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => duplicate(template)}>
                  Duplicate
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={() => remove(template.id)}>
                  Delete
                </Button>
              </div>
            </div>
            <pre className="mt-4 overflow-x-auto rounded-2xl bg-secondary p-4 text-xs text-secondary-foreground">
              {template.htmlContent}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
