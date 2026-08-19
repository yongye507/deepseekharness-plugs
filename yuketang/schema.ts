import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * 雨课堂登录凭证(单行:重新扫码登录会覆盖)。
 * user_id + auth 即雨课堂的认证凭证,请求时带 Authorization: Bearer <auth>。
 */
export const yktCredentials = sqliteTable("ykt_credentials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  user_id: text("user_id").notNull(),
  auth: text("auth").notNull(),
  login_at: integer("login_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});
