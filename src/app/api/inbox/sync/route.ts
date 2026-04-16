import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { syncReceivedEmailsForUser } from "@/lib/email/service";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncReceivedEmailsForUser(session.user.id, 25);
    return NextResponse.json({ message: `Synced ${result.count} received emails.`, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to sync inbox." },
      { status: 400 },
    );
  }
}
