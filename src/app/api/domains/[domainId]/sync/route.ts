import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { syncDomainForUser } from "@/lib/email/service";

type Context = {
  params: Promise<{ domainId: string }>;
};

export async function POST(_request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { domainId } = await context.params;
    const item = await syncDomainForUser(session.user.id, domainId);
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to sync domain." },
      { status: 400 },
    );
  }
}
