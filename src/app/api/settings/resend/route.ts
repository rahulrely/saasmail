import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { upsertResendConfig } from "@/lib/email/service";
import { resendConfigSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = resendConfigSchema.parse(await request.json());
    await upsertResendConfig(session.user.id, parsed);
    return NextResponse.json({ message: "Resend settings saved and validated." });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save settings." },
      { status: 400 },
    );
  }
}
