import { neon } from "@neondatabase/serverless";

const globalForSql = globalThis as unknown as { sql?: ReturnType<typeof neon> };

export const sql =
  globalForSql.sql ??
  neon(process.env.DATABASE_URL!, {
    fetchOptions: {
      cache: "no-store",
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForSql.sql = sql;
}
