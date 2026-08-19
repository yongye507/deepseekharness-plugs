import type { ApiHandler } from "../../../src/platform/feature";
import { fetchQrCode, getCourses, getUserInfo, pollScan } from "./yuketang";
import { clearCredential, getCredential, saveCredential } from "./repo";

/** 雨课堂功能 API,由 manifest 注册到 /api/features/yuketang/... */
export const api: Record<string, ApiHandler> = {
  // 登录状态(含会话剩余时间)
  "GET /status": () => {
    const cred = getCredential();
    const expired = cred ? cred.expires_at <= Date.now() : false;
    return Response.json({
      loggedIn: !!cred && !expired,
      expired: !!cred && expired,
      loginAt: cred?.loginAt ?? null,
      expiresAt: cred?.expires_at ?? null,
    });
  },

  // 获取扫码二维码
  "POST /qrcode": async () => {
    try {
      const qr = await fetchQrCode();
      return Response.json({ ok: true, ...qr });
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 502 });
    }
  },

  // 长轮询等待扫码(请求会挂起,扫码确认后返回并保存凭证)
  "POST /poll": async (req: Request) => {
    try {
      const body = (await req.json()) as { token?: string };
      if (!body.token) return Response.json({ error: "缺少 token" }, { status: 400 });
      const cred = await pollScan(body.token);
      saveCredential(cred);
      return Response.json({ ok: true });
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 400 });
    }
  },

  // 退出登录(清除凭证)
  "POST /logout": () => {
    clearCredential();
    return Response.json({ ok: true });
  },

  // 课程列表
  "GET /courses": async () => {
    const cred = getCredential();
    if (!cred) return Response.json({ error: "未登录" }, { status: 401 });
    if (cred.expires_at <= Date.now()) {
      return Response.json({ error: "登录已过期,请重新扫码" }, { status: 401 });
    }
    try {
      const courses = await getCourses(cred);
      return Response.json({ ok: true, courses });
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 502 });
    }
  },

  // 用户信息
  "GET /profile": async () => {
    const cred = getCredential();
    if (!cred) return Response.json({ error: "未登录" }, { status: 401 });
    try {
      const profile = await getUserInfo(cred);
      return Response.json({ ok: true, profile });
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 502 });
    }
  },
};
