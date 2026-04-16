import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { registerSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const parsed = registerSchema.parse(await request.json());
    const existing = await db.user.findUnique({ where: { email: parsed.email } });

    if (existing) {
      return NextResponse.json({ error: "Email is already registered." }, { status: 409 });
    }

    const passwordHash = await hash(parsed.password, 12);
    await db.user.create({
      data: {
        name: parsed.name,
        email: parsed.email,
        passwordHash,
      },
    });

    return NextResponse.json({ message: "Account created." }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create account." },
      { status: 400 },
    );
  }
}
