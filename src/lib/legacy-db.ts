import { Pool, QueryResult } from "pg";

type SqlClient = Pool;
const globalForSql = globalThis as unknown as { sql?: SqlClient | undefined };

function getSqlClient(): SqlClient {
  if (globalForSql.sql) {
    return globalForSql.sql;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Pool({
    connectionString: databaseUrl,
  });

  if (process.env.NODE_ENV !== "production") {
    globalForSql.sql = client;
  }

  return client;
}

export const sql = getSqlClient().query.bind(getSqlClient());
