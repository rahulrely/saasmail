import { subMinutes } from "date-fns";

import { db } from "@/lib/db";

export async function assertSendRateLimit(userId: string, route: string, limit = 20) {
  const windowStart = subMinutes(new Date(), 1);
  const count = await db.rateLimitEvent.count({
    where: {
      userId,
      route,
      createdAt: { gte: windowStart },
    },
  });

  if (count >= limit) {
    throw new Error("Rate limit exceeded. Please wait before sending more email.");
  }

  await db.rateLimitEvent.create({
    data: { userId, route },
  });
}
