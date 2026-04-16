import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { deleteTemplate, updateTemplate } from "@/lib/email/service";
import { templateSchema } from "@/lib/schemas";

type Context = {
  params: Promise<{ templateId: string }>;
};

export async function PATCH(request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { templateId } = await context.params;
    const parsed = templateSchema.parse(await request.json());
    const item = await updateTemplate(session.user.id, templateId, parsed);
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update template." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { templateId } = await context.params;
    await deleteTemplate(session.user.id, templateId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete template." },
      { status: 400 },
    );
  }
}
