import { db } from "@/drizzle/db";
import { UserSubscriptionTable } from "@/drizzle/schema";
import { CACHE_TAGS, revalidateDbCache } from "@/lib/cache";

export async function createUserSubscription(
  data: typeof UserSubscriptionTable.$inferInsert
) {
  const [newSubscription] = await db
    .insert(UserSubscriptionTable)
    .values(data)
    .onConflictDoNothing({
      target: UserSubscriptionTable.clerkUserId,
    })
    .returning({
      userId: UserSubscriptionTable.clerkUserId,
      id: UserSubscriptionTable.id,
    });

  if (newSubscription != null) {
    revalidateDbCache({
      tag: CACHE_TAGS.subscription,
      userId: newSubscription.userId,
      id: newSubscription.id,
    });
  }

  return newSubscription;
}
