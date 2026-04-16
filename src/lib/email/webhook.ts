import { EmailDeliveryStatus, type Prisma } from "@prisma/client";
import { Webhook } from "svix";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { syncReceivedEmailByIdForUser } from "@/lib/email/service";

type ResendWebhookHeaders = {
  id: string;
  timestamp: string;
  signature: string;
};

type GenericWebhookPayload = {
  type?: string;
  created_at?: string;
  data?: Record<string, any>;
};

export function verifyResendWebhook(payload: string, headers: ResendWebhookHeaders) {
  const webhook = new Webhook(env.RESEND_WEBHOOK_SECRET ?? "");
  return webhook.verify(payload, {
    "svix-id": headers.id,
    "svix-timestamp": headers.timestamp,
    "svix-signature": headers.signature,
  }) as GenericWebhookPayload;
}

function extractRecipientList(data: Record<string, any>) {
  const raw = data.to ?? data.recipients ?? [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") return raw.split(",").map((value) => value.trim());
  return [];
}

function extractEmailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
}

function domainFromEmail(email: string) {
  return extractEmailAddress(email).split("@")[1]?.toLowerCase() ?? "";
}

async function resolveUserIdForRecipients(recipients: string[]) {
  const normalizedRecipients = recipients.map(extractEmailAddress).filter(Boolean);
  const recipientDomains = normalizedRecipients.map(domainFromEmail).filter(Boolean);

  const exactAddressMatch = await db.emailProviderConfig.findFirst({
    where: {
      defaultFromEmail: {
        in: normalizedRecipients,
        mode: "insensitive",
      },
    },
    select: { userId: true },
  });

  if (exactAddressMatch) {
    return exactAddressMatch.userId;
  }

  const [domains, configs] = await Promise.all([
    db.domain.findMany({
      select: { userId: true, name: true },
    }),
    db.emailProviderConfig.findMany({
      select: { userId: true, verifiedDomain: true },
    }),
  ]);

  const domainMatch = domains.find((domain) =>
    recipientDomains.some(
      (recipientDomain) =>
        recipientDomain === domain.name.toLowerCase() ||
        recipientDomain.endsWith(`.${domain.name.toLowerCase()}`),
    ),
  );
  if (domainMatch) {
    return domainMatch.userId;
  }

  const configMatch = configs.find((config) =>
    recipientDomains.some(
      (recipientDomain) =>
        recipientDomain === config.verifiedDomain.toLowerCase() ||
        recipientDomain.endsWith(`.${config.verifiedDomain.toLowerCase()}`),
    ),
  );

  return configMatch?.userId ?? null;
}

export async function persistIncomingWebhook(payload: GenericWebhookPayload) {
  const data = payload.data ?? {};
  const recipients = extractRecipientList(data);
  const userId = await resolveUserIdForRecipients(recipients);
  if (!userId) return null;

  const deliveryStatus =
    payload.type === "email.delivered"
      ? EmailDeliveryStatus.DELIVERED
      : payload.type === "email.bounced"
        ? EmailDeliveryStatus.FAILED
        : undefined;

  if (payload.type?.startsWith("email.")) {
    await db.sentEmailLog.updateMany({
      where: {
        userId,
        resendEmailId: data.email_id ?? data.id,
      },
      data: {
        status: deliveryStatus,
        errorMessage: data.bounce?.message ?? undefined,
      },
    });
  }

  if (payload.type === "email.received" || payload.type === "inbound.received") {
    const resendEventId =
      typeof data.email_id === "string"
        ? data.email_id
        : typeof data.id === "string"
          ? data.id
          : null;

    if (resendEventId) {
      try {
        return await syncReceivedEmailByIdForUser(userId, resendEventId);
      } catch {
        // Fall back to storing the webhook payload if the detail lookup is unavailable.
      }
    }

    if (!resendEventId) {
      return db.receivedEmail.create({
        data: {
          userId,
          fromEmail: extractEmailAddress(data.from ?? "unknown@unknown"),
          toEmail: extractEmailAddress(recipients[0] ?? "unknown@unknown"),
          subject: data.subject ?? null,
          textBody: data.text ?? null,
          htmlBody: data.html ?? null,
          attachmentsMeta: (data.attachments ?? []) as Prisma.InputJsonValue,
          headersJson: (data.headers ?? {}) as Prisma.InputJsonValue,
          rawPayload: payload as Prisma.InputJsonValue,
          receivedAt: payload.created_at ? new Date(payload.created_at) : new Date(),
        },
      });
    }

    return db.receivedEmail.upsert({
      where: { resendEventId },
      create: {
        userId,
        resendEventId,
        fromEmail: extractEmailAddress(data.from ?? "unknown@unknown"),
        toEmail: extractEmailAddress(recipients[0] ?? "unknown@unknown"),
        subject: data.subject ?? null,
        textBody: data.text ?? null,
        htmlBody: data.html ?? null,
        attachmentsMeta: (data.attachments ?? []) as Prisma.InputJsonValue,
        headersJson: (data.headers ?? {}) as Prisma.InputJsonValue,
        rawPayload: payload as Prisma.InputJsonValue,
        receivedAt: payload.created_at ? new Date(payload.created_at) : new Date(),
      },
      update: {
        attachmentsMeta: (data.attachments ?? []) as Prisma.InputJsonValue,
        headersJson: (data.headers ?? {}) as Prisma.InputJsonValue,
        rawPayload: payload as Prisma.InputJsonValue,
        receivedAt: payload.created_at ? new Date(payload.created_at) : new Date(),
      },
    });
  }

  return null;
}
