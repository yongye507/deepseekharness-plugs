import { db } from "@/db";
import { yktCredentials } from "../schema";
import type { Credential } from "./yuketang";

/** 读取当前凭证(单行,未登录返回 null) */
export function getCredential(): (Credential & { loginAt: number }) | null {
  const row = db.select().from(yktCredentials).limit(1).get();
  if (!row) return null;
  return {
    user_id: row.user_id,
    auth: row.auth,
    session_id: row.session_id,
    expires_at: row.expires_at.getTime(),
    loginAt: row.login_at.getTime(),
  };
}

/** 保存凭证(覆盖旧凭证,单行) */
export function saveCredential(cred: Credential) {
  db.delete(yktCredentials).run();
  db.insert(yktCredentials)
    .values({
      user_id: cred.user_id,
      auth: cred.auth,
      session_id: cred.session_id,
      expires_at: new Date(cred.expires_at),
    })
    .run();
}

/** 清除凭证(退出登录) */
export function clearCredential() {
  db.delete(yktCredentials).run();
}
