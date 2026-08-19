import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * 雨课堂登录凭证(单行:重新扫码登录会覆盖)。
 * 认证方式:session_id(sessionid cookie)为关键凭证;user_id/auth 备用。
 */
export const yktCredentials = sqliteTable("ykt_credentials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  user_id: text("user_id").notNull(),
  auth: text("auth").notNull(),
  /** sessionid cookie 值(实际认证凭证) */
  session_id: text("session_id").notNull(),
  /** 会话过期时间(Unix 毫秒) */
  expires_at: integer("expires_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  login_at: integer("login_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});
