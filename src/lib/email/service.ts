import { EmailDeliveryStatus, Prisma } from "@prisma/client";
import { Resend } from "resend";

import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import { interpolateTemplate } from "@/lib/email/render";
import type { ResendConfigInput, SendEmailInput, TemplateInput } from "@/lib/schemas";

function getResend(apiKey: string) {
  return new Resend(apiKey);
}

async function resendFetch<T>(apiKey: string, path: string) {
  const response = await fetch(`https://api.resend.com${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": "saasmail/1.0",
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as T & { message?: string; error?: string };
  if (!response.ok) {
    throw new Error(payload.message || payload.error || "Resend request failed.");
  }

  return payload;
}

type ResendReceivingListItem = {
  id: string;
  to: string[];
  from: string;
  created_at: string;
  subject?: string | null;
  attachments?: Array<Record<string, unknown>>;
};

type ResendReceivingDetail = ResendReceivingListItem & {
  html?: string | null;
  text?: string | null;
  headers?: Record<string, unknown> | null;
  raw?: Record<string, unknown> | null;
  cc?: string[] | null;
  bcc?: string[] | null;
  reply_to?: string[] | null;
  message_id?: string | null;
};

function normalizeEmailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
}

function matchesUserReceivingAddress(addresses: string[], config: { defaultFromEmail: string; verifiedDomain: string }) {
  const defaultAddress = normalizeEmailAddress(config.defaultFromEmail);
  const domain = config.verifiedDomain.toLowerCase();

  return addresses.some((address) => {
    const normalized = normalizeEmailAddress(address);
    const emailDomain = normalized.split("@")[1] ?? "";
    return normalized === defaultAddress || emailDomain === domain || emailDomain.endsWith(`.${domain}`);
  });
}

export async function validateResendApiKey(apiKey: string) {
  const resend = getResend(apiKey);
  const { error } = await resend.domains.list();
  if (error) {
    throw new Error(error.message || "Unable to validate API key");
  }
}

export async function upsertResendConfig(userId: string, input: ResendConfigInput) {
  await validateResendApiKey(input.resendApiKey);

  return db.emailProviderConfig.upsert({
    where: { userId },
    create: {
      userId,
      resendApiKeyEnc: encryptSecret(input.resendApiKey),
      verifiedDomain: input.verifiedDomain,
      productName: input.productName,
      defaultFromEmail: input.defaultFromEmail,
      lastValidatedAt: new Date(),
    },
    update: {
      resendApiKeyEnc: encryptSecret(input.resendApiKey),
      verifiedDomain: input.verifiedDomain,
      productName: input.productName,
      defaultFromEmail: input.defaultFromEmail,
      lastValidatedAt: new Date(),
    },
  });
}

export async function getUserProviderConfig(userId: string) {
  const config = await db.emailProviderConfig.findUnique({ where: { userId } });
  if (!config) throw new Error("Configure your Resend workspace first.");

  return {
    ...config,
    resendApiKey: decryptSecret(config.resendApiKeyEnc),
    webhookSecret: config.webhookSecretEnc ? decryptSecret(config.webhookSecretEnc) : null,
  };
}

export async function createTemplate(userId: string, input: TemplateInput) {
  return db.emailTemplate.create({
    data: {
      userId,
      name: input.name,
      subject: input.subject,
      htmlContent: input.htmlContent,
      variablesJson: input.variablesJson ?? Prisma.JsonNull,
    },
  });
}

export async function updateTemplate(userId: string, templateId: string, input: TemplateInput) {
  const template = await db.emailTemplate.findFirst({
    where: { id: templateId, userId },
  });
  if (!template) throw new Error("Template not found.");

  return db.emailTemplate.update({
    where: { id: template.id },
    data: {
      name: input.name,
      subject: input.subject,
      htmlContent: input.htmlContent,
      variablesJson: input.variablesJson ?? Prisma.JsonNull,
    },
  });
}

export async function deleteTemplate(userId: string, templateId: string) {
  const template = await db.emailTemplate.findFirst({
    where: { id: templateId, userId },
  });
  if (!template) throw new Error("Template not found.");
  return db.emailTemplate.delete({ where: { id: template.id } });
}

export async function sendEmailForUser(userId: string, input: SendEmailInput) {
  const config = await getUserProviderConfig(userId);
  const resend = getResend(config.resendApiKey);

  let subject = input.subject ?? "";
  let html = input.rawHtml ?? "";
  let text = input.plainText ?? "";
  let templateId: string | undefined;

  if (input.templateId) {
    const template = await db.emailTemplate.findFirst({
      where: { id: input.templateId, userId },
    });
    if (!template) throw new Error("Template not found.");

    templateId = template.id;
    subject = interpolateTemplate(input.subject || template.subject, input.variables ?? {});
    html = interpolateTemplate(template.htmlContent, input.variables ?? {});
  } else {
    subject = interpolateTemplate(input.subject || "", input.variables ?? {});
    html = interpolateTemplate(html, input.variables ?? {});
    text = interpolateTemplate(text, input.variables ?? {});
  }

  const scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null;
  if (scheduledFor && scheduledFor > new Date()) {
    return db.sentEmailLog.create({
      data: {
        userId,
        templateId,
        recipient: input.recipient,
        subject,
        renderedHtml: html || text,
        variablesJson: input.variables ?? Prisma.JsonNull,
        status: EmailDeliveryStatus.SCHEDULED,
        scheduledFor,
      },
    });
  }

  const from = `${config.productName} <${config.defaultFromEmail}>`;
  const { data, error } = html
    ? await resend.emails.send({
        from,
        to: [input.recipient],
        subject,
        html,
        ...(text ? { text } : {}),
      })
    : await resend.emails.send({
        from,
        to: [input.recipient],
        subject,
        text,
      });

  return db.sentEmailLog.create({
    data: {
      userId,
      templateId,
      recipient: input.recipient,
      subject,
      renderedHtml: html || text,
      variablesJson: input.variables ?? Prisma.JsonNull,
      resendEmailId: data?.id ?? null,
      status: error ? EmailDeliveryStatus.FAILED : EmailDeliveryStatus.SENT,
      errorMessage: error?.message ?? null,
      sentAt: error ? null : new Date(),
    },
  });
}

export async function createDomainForUser(userId: string, name: string) {
  const config = await getUserProviderConfig(userId);
  const resend = getResend(config.resendApiKey);
  const existing = await db.domain.findFirst({
    where: {
      userId,
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
  });

  if (existing) {
    throw new Error("This domain is already connected. Use fetch domains to sync existing Resend domains.");
  }

  const { data, error } = await resend.domains.create({ name });

  if (error || !data) throw new Error(error?.message || "Unable to create domain");

  await db.domain.upsert({
    where: {
      userId_name: { userId, name: data.name },
    },
    create: {
      userId,
      resendDomainId: data.id,
      name: data.name,
      status: data.status,
      region: data.region,
      recordsJson: data.records as unknown as Prisma.InputJsonValue,
      lastSyncedAt: new Date(),
    },
    update: {
      resendDomainId: data.id,
      status: data.status,
      region: data.region,
      recordsJson: data.records as unknown as Prisma.InputJsonValue,
      lastSyncedAt: new Date(),
    },
  });

  return data;
}

export async function importExistingDomainsForUser(userId: string) {
  const config = await getUserProviderConfig(userId);
  const resend = getResend(config.resendApiKey);
  const { data, error } = await resend.domains.list();

  if (error || !data?.data) {
    throw new Error(error?.message || "Unable to fetch domains from Resend.");
  }

  const imported = await Promise.all(
    data.data.map(async (domain) => {
      const detailResponse = await resend.domains.get(domain.id);
      const records = detailResponse.data?.records ?? null;

      return db.domain.upsert({
        where: {
          userId_name: {
            userId,
            name: domain.name,
          },
        },
        create: {
          userId,
          resendDomainId: domain.id,
          name: domain.name,
          status: domain.status,
          region: domain.region ?? null,
          recordsJson: records as unknown as Prisma.InputJsonValue,
          lastSyncedAt: new Date(),
        },
        update: {
          resendDomainId: domain.id,
          status: domain.status,
          region: domain.region ?? null,
          recordsJson: records as unknown as Prisma.InputJsonValue,
          lastSyncedAt: new Date(),
        },
      });
    }),
  );

  return imported;
}

export async function syncDomainForUser(userId: string, localDomainId: string) {
  const config = await getUserProviderConfig(userId);
  const resend = getResend(config.resendApiKey);
  const domain = await db.domain.findFirst({
    where: { id: localDomainId, userId },
  });

  if (!domain?.resendDomainId) throw new Error("Domain not found.");

  const { data, error } = await resend.domains.get(domain.resendDomainId);
  if (error || !data) throw new Error(error?.message || "Unable to sync domain");

  return db.domain.update({
    where: { id: domain.id },
    data: {
      status: data.status,
      region: data.region,
      recordsJson: data.records as unknown as Prisma.InputJsonValue,
      lastSyncedAt: new Date(),
    },
  });
}

async function upsertReceivedEmailFromDetail(userId: string, detail: ResendReceivingDetail) {
  const toEmail = normalizeEmailAddress(detail.to?.[0] ?? "unknown@unknown");

  return db.receivedEmail.upsert({
    where: { resendEventId: detail.id },
    create: {
      userId,
      resendEventId: detail.id,
      fromEmail: normalizeEmailAddress(detail.from ?? "unknown@unknown"),
      toEmail,
      subject: detail.subject ?? null,
      textBody: detail.text ?? null,
      htmlBody: detail.html ?? null,
      attachmentsMeta: (detail.attachments ?? []) as Prisma.InputJsonValue,
      headersJson: (detail.headers ?? {}) as Prisma.InputJsonValue,
      rawPayload: detail as Prisma.InputJsonValue,
      receivedAt: detail.created_at ? new Date(detail.created_at) : new Date(),
    },
    update: {
      fromEmail: normalizeEmailAddress(detail.from ?? "unknown@unknown"),
      toEmail,
      subject: detail.subject ?? null,
      textBody: detail.text ?? null,
      htmlBody: detail.html ?? null,
      attachmentsMeta: (detail.attachments ?? []) as Prisma.InputJsonValue,
      headersJson: (detail.headers ?? {}) as Prisma.InputJsonValue,
      rawPayload: detail as Prisma.InputJsonValue,
      receivedAt: detail.created_at ? new Date(detail.created_at) : new Date(),
    },
  });
}

export async function syncReceivedEmailsForUser(userId: string, limit = 20) {
  const config = await getUserProviderConfig(userId);

  const listResponse = await resendFetch<{
    data: ResendReceivingListItem[];
    has_more: boolean;
    object: string;
  }>(config.resendApiKey, `/emails/receiving?limit=${limit}`);

  const matched = listResponse.data.filter((item) => matchesUserReceivingAddress(item.to ?? [], config));

  const synced = await Promise.all(
    matched.map(async (item) => {
      const detailResponse = await resendFetch<{ data?: ResendReceivingDetail } & ResendReceivingDetail>(
        config.resendApiKey,
        `/emails/receiving/${item.id}`,
      );

      const detail = ("data" in detailResponse && detailResponse.data ? detailResponse.data : detailResponse) as ResendReceivingDetail;
      return upsertReceivedEmailFromDetail(userId, detail);
    }),
  );

  return {
    count: synced.length,
    items: synced,
  };
}

export async function syncReceivedEmailByIdForUser(userId: string, emailId: string) {
  const config = await getUserProviderConfig(userId);
  const detailResponse = await resendFetch<{ data?: ResendReceivingDetail } & ResendReceivingDetail>(
    config.resendApiKey,
    `/emails/receiving/${emailId}`,
  );

  const detail = ("data" in detailResponse && detailResponse.data ? detailResponse.data : detailResponse) as ResendReceivingDetail;
  return upsertReceivedEmailFromDetail(userId, detail);
}
