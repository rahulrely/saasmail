import { NextResponse } from "next/server";

import { persistIncomingWebhook, verifyResendWebhook } from "@/lib/email/webhook";

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const result = verifyResendWebhook(payload, {
      id: request.headers.get("svix-id") ?? "",
      timestamp: request.headers.get("svix-timestamp") ?? "",
      signature: request.headers.get("svix-signature") ?? "",
    });

    await persistIncomingWebhook(result as Record<string, unknown>);
    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid webhook." },
      { status: 400 },
    );
  }
}
