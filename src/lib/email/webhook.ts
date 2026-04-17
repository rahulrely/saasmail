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
  data?: Record<string, unknown>;
};

export function verifyResendWebhook(payload: string, headers: ResendWebhookHeaders) {
  const webhook = new Webhook(env.RESEND_WEBHOOK_SECRET ?? "");
  return webhook.verify(payload, {
    "svix-id": headers.id,
    "svix-timestamp": headers.timestamp,
    "svix-signature": headers.signature,
  }) as GenericWebhookPayload;
}

function extractRecipientList(data: Record<string, unknown>) {
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
  const resendEmailId =
    typeof data.email_id === "string" ? data.email_id : typeof data.id === "string" ? data.id : undefined;
  const bounceMessage =
    data.bounce && typeof data.bounce === "object" && "message" in data.bounce && typeof data.bounce.message === "string"
      ? data.bounce.message
      : undefined;
  const fromEmail = extractEmailAddress(typeof data.from === "string" ? data.from : "unknown@unknown");
  const subject = typeof data.subject === "string" ? data.subject : null;
  const textBody = typeof data.text === "string" ? data.text : null;
  const htmlBody = typeof data.html === "string" ? data.html : null;

  if (payload.type?.startsWith("email.")) {
    await db.sentEmailLog.updateMany({
      where: {
        userId,
        resendEmailId,
      },
      data: {
        status: deliveryStatus,
        errorMessage: bounceMessage,
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
          fromEmail,
          toEmail: extractEmailAddress(recipients[0] ?? "unknown@unknown"),
          subject,
          textBody,
          htmlBody,
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
        fromEmail,
        toEmail: extractEmailAddress(recipients[0] ?? "unknown@unknown"),
        subject,
        textBody,
        htmlBody,
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
