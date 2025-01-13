import { db } from "@/drizzle/db";
import { ProductCustomizationTable, ProductTable } from "@/drizzle/schema";
import {
  CACHE_TAGS,
  dbCache,
  getGlobalTag,
  getIdTag,
  getUserTag,
  revalidateDbCache,
} from "@/lib/cache";
import { and, eq } from "drizzle-orm";

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
