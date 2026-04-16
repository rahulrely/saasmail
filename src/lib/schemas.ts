import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const resendConfigSchema = z.object({
  resendApiKey: z.string().startsWith("re_", "Use a valid Resend API key."),
  verifiedDomain: z.string().min(3),
  productName: z.string().min(2).max(120),
  defaultFromEmail: z.string().email(),
});

export const templateSchema = z.object({
  name: z.string().min(2).max(120),
  subject: z.string().min(1).max(250),
  htmlContent: z.string().min(1),
  variablesJson: z.union([z.record(z.any()), z.null()]).optional(),
});

export const sendEmailSchema = z
  .object({
    recipient: z.string().email(),
    subject: z.string().min(1).max(250).optional(),
    templateId: z.string().cuid().optional(),
    rawHtml: z.string().optional(),
    plainText: z.string().optional(),
    variables: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
    scheduledFor: z.string().datetime().optional(),
  })
  .refine((value) => value.templateId || value.rawHtml || value.plainText, {
    message: "Provide a template, raw HTML, or plain text.",
    path: ["templateId"],
  });

export const domainCreateSchema = z.object({
  name: z.string().min(3),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type ResendConfigInput = z.infer<typeof resendConfigSchema>;
export type TemplateInput = z.infer<typeof templateSchema>;
export type SendEmailInput = z.infer<typeof sendEmailSchema>;
