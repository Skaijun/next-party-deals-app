import { db } from "@/drizzle/db";
import {
  CountryGroupDiscountsTable,
  ProductCustomizationTable,
  ProductTable,
} from "@/drizzle/schema";
import {
  CACHE_TAGS,
  dbCache,
  getGlobalTag,
  getIdTag,
  getUserTag,
  revalidateDbCache,
} from "@/lib/cache";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { BatchItem } from "drizzle-orm/batch";

// whenever we modify our db
// we make sure we call revalidate db cache
// and we pass it along all the information
// i.e. when we delete a product:
//// we know exactly what user that was for
//// we know exactly what the idea of the product
//// we know what thing we're tagging
//// that as in our case - PRODUCT
//// so we are going to invalidate all the different tags:
////// individual id, userId (clerkUserId) and the actual tag for the overall Global products

// *** !IMPORTANT *** (fixed in NEXT v15+)
// we need to make sure to add key to nextConfig object inside "next.config.mjs"
// =============================================
// const nextConfig: NextConfig = {
//   experimental: { staleTimes: { dynamic: 0 } }
// };
// =============================================

export function getProducts(userId: string, { limit }: { limit?: number }) {
  const cacheFn = dbCache(getProductsInternal, {
    tags: [getUserTag(userId, CACHE_TAGS.products)],
  });

  return cacheFn(userId, { limit });
}

export function getProductsInternal(
  userId: string,
  { limit }: { limit?: number }
) {
  return db.query.ProductTable.findMany({
    where: ({ clerkUserId }, { eq }) => eq(clerkUserId, userId),
    orderBy: ({ createdAt }, { desc }) => desc(createdAt),
    limit,
  });
}

export function getProduct({ id, userId }: { id: string; userId: string }) {
  const cacheFn = dbCache(getProductInternal, {
    tags: [getIdTag(id, CACHE_TAGS.products)],
  });

  return cacheFn({ id, userId });
}

export function getProductCount(userId: string) {
  const cacheFn = dbCache(getProductCountInternal, {
    tags: [getUserTag(userId, CACHE_TAGS.products)],
  });

  return cacheFn(userId);
}

export function getProductInternal({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  return db.query.ProductTable.findFirst({
    where: ({ clerkUserId, id: idCol }, { eq, and }) =>
      and(eq(clerkUserId, userId), eq(idCol, id)),
  });
}

export async function createProduct(data: typeof ProductTable.$inferInsert) {
  const [newProduct] = await db
    .insert(ProductTable)
    .values(data)
    .returning({ id: ProductTable.id, userId: ProductTable.clerkUserId });

  try {
    await db
      .insert(ProductCustomizationTable)
      .values({ productId: newProduct.id })
      .onConflictDoNothing({
        target: ProductCustomizationTable.productId,
      });
  } catch (error) {
    await db.delete(ProductTable).where(eq(ProductTable.id, newProduct.id));
  }

  revalidateDbCache({
    tag: CACHE_TAGS.products,
    userId: newProduct.userId,
    id: newProduct.id,
  });

  return newProduct;
}

export async function updateProduct(
  data: Partial<typeof ProductTable.$inferInsert>,
  { id, userId }: { id: string; userId: string }
) {
  const { rowCount } = await db
    .update(ProductTable)
    .set(data)
    .where(and(eq(ProductTable.clerkUserId, userId), eq(ProductTable.id, id)));

  if (rowCount > 0) {
    revalidateDbCache({
      tag: CACHE_TAGS.products,
      userId,
      id,
    });
  }
  return rowCount > 0;
}

export async function deleteProduct({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  const { rowCount } = await db
    .delete(ProductTable)
    .where(and(eq(ProductTable.id, id), eq(ProductTable.clerkUserId, userId)));

  if (rowCount > 0) {
    revalidateDbCache({
      tag: CACHE_TAGS.products,
      userId,
      id,
    });
  }

  return rowCount > 0; // indicates, if any rows has been deleted
}

export async function getProductCountryGroups({
  productId,
  userId,
}: {
  productId: string;
  userId: string;
}) {
  const cacheFn = dbCache(getProductCountryGroupsInternal, {
    tags: [
      getIdTag(productId, CACHE_TAGS.products),
      getGlobalTag(CACHE_TAGS.countries),
      getGlobalTag(CACHE_TAGS.countryGroups),
    ],
  });

  return cacheFn({
    productId,
    userId,
  });
}

export async function getProductCustomization({
  productId,
  userId,
}: {
  productId: string;
  userId: string;
}) {
  const cacheFn = dbCache(getProductCustomizationInternal, {
    tags: [getIdTag(productId, CACHE_TAGS.products)],
  });

  return cacheFn({
    productId,
    userId,
  });
}

export async function updateCountryDiscounts(
  deleteGroup: { countryGroupId: string }[],
  insertGroup: (typeof CountryGroupDiscountsTable.$inferInsert)[],
  { productId, userId }: { productId: string; userId: string }
) {
  const product = await getProduct({ id: productId, userId });
  if (product == null) return false;

  const statements: BatchItem<"pg">[] = [];
  if (deleteGroup.length > 0) {
    statements.push(
      db.delete(CountryGroupDiscountsTable).where(
        and(
          eq(CountryGroupDiscountsTable.productId, productId),
          inArray(
            CountryGroupDiscountsTable.countryGroupId,
            deleteGroup.map((group) => group.countryGroupId)
          )
        )
      )
    );
  }

  if (insertGroup.length > 0) {
    statements.push(
      db
        .insert(CountryGroupDiscountsTable)
        .values(insertGroup)
        .onConflictDoUpdate({
          target: [
            CountryGroupDiscountsTable.productId,
            CountryGroupDiscountsTable.countryGroupId,
          ],
          set: {
            coupon: sql.raw(
              `excluded.${CountryGroupDiscountsTable.coupon.name}`
            ),
            discountPercentage: sql.raw(
              `excluded.${CountryGroupDiscountsTable.discountPercentage.name}`
            ),
          },
        })
    );
  }

  if (statements.length > 0) {
    await db.batch(statements as [BatchItem<"pg">]);
  }

  revalidateDbCache({
    tag: CACHE_TAGS.products,
    userId,
    id: productId,
  });
}

export async function updateProductCustomization(
  data: Partial<typeof ProductCustomizationTable.$inferInsert>,
  { productId, userId }: { productId: string; userId: string }
) {
  const product = await getProduct({ id: productId, userId });
  if (product == null) return false;

  await db
    .update(ProductCustomizationTable)
    .set(data)
    .where(eq(ProductCustomizationTable.productId, productId));

  revalidateDbCache({
    tag: CACHE_TAGS.products,
    userId,
    id: productId,
  });
}

// we want to get all country groups (i.e.: "50%-discout" | "25%-discout" | "10%-discout")
// then all countries for those specific country groups
async function getProductCountryGroupsInternal({
  productId,
  userId,
}: {
  productId: string;
  userId: string;
}) {
  // first make sure user has access to the country groups by checking
  // product availability for current user
  const product = await getProduct({ id: productId, userId });
  if (product == null) return [];

  const data = await db.query.CountryGroupTable.findMany({
    with: {
      // individual countries for each country group
      countries: {
        columns: {
          name: true,
          code: true,
        },
      },
      // below get the discount the User has associated with that country
      // if they have one
      countryGroupDiscounts: {
        columns: {
          coupon: true,
          discountPercentage: true,
        },
        where: ({ productId: id }, { eq }) => eq(id, productId),
      },
    },
  });

  return data.map((countryGroup) => {
    return {
      id: countryGroup.id,
      name: countryGroup.name,
      recommendedDiscountPercentage: countryGroup.recommendedDiscountPercentage,
      countries: countryGroup.countries,
      discount: countryGroup.countryGroupDiscounts.at(0),
    };
  });
}

async function getProductCustomizationInternal({
  productId,
  userId,
}: {
  productId: string;
  userId: string;
}) {
  const data = await db.query.ProductTable.findFirst({
    where: ({ id, clerkUserId }, { and, eq }) =>
      and(eq(id, productId), eq(clerkUserId, userId)),
    with: { productCustomization: true },
  });

  return data?.productCustomization;
}

async function getProductCountInternal(userId: string) {
  const counts = await db
    .select({ productCount: count() })
    .from(ProductTable)
    .where(eq(ProductTable.clerkUserId, userId));

  return counts[0]?.productCount ?? 0;
}
