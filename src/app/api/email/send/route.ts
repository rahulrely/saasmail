import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { sendEmailForUser } from "@/lib/email/service";
import { assertSendRateLimit } from "@/lib/ratelimit";
import { sendEmailSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertSendRateLimit(session.user.id, "/api/email/send");
    const parsed = sendEmailSchema.parse(await request.json());
    const log = await sendEmailForUser(session.user.id, parsed);

    return NextResponse.json({
      message: log.status === "SCHEDULED" ? "Email scheduled." : "Email processed.",
      log,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to send email." },
      { status: 400 },
    );
  }
}
