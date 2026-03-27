import { neon } from "@neondatabase/serverless";

type SqlClient = ReturnType<typeof neon<false, false>>;
const globalForSql = globalThis as unknown as { sql?: SqlClient | undefined };

function getSqlClient(): SqlClient {
  if (globalForSql.sql) {
    return globalForSql.sql;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = neon(databaseUrl, {
    fetchOptions: {
      cache: "no-store",
    },
  });

  if (process.env.NODE_ENV !== "production") {
    globalForSql.sql = client;
  }

  return client;
}

export const sql = ((...args: Parameters<SqlClient>) => {
  const client = getSqlClient();
  return client(...args);
}) as SqlClient;
