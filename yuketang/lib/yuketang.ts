/**
 * 雨课堂 API 客户端。
 * 认证方式(已逆向确认):扫码登录拿到 { user_id, auth },
 * 业务请求带 Authorization: Bearer <auth>。
 */

const YKT = "https://www.yuketang.cn";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

export type Credential = { user_id: string; auth: string };

export type QrInfo = { qrContent: string; token: string };

/** 1. 获取扫码登录二维码(token 约 5 分钟有效) */
export async function fetchQrCode(): Promise<QrInfo> {
  const res = await fetch(`${YKT}/api/v3/user/login/app-web-pre-info`, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json();
  if (json.code !== 0 || !json.data?.token || !json.data?.qrContent) {
    throw new Error(json.msg || "获取二维码失败");
  }
  return { qrContent: json.data.qrContent, token: json.data.token };
}

/** 2. 长轮询等待扫码确认(挂起,成功后返回凭证) */
export async function pollScan(token: string): Promise<Credential> {
  const res = await fetch(`${YKT}/api/v3/user/login/app-web-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify({ token }),
    // token 约 5 分钟有效,长轮询最久挂到那时
    signal: AbortSignal.timeout(295_000),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // 响应可能为空
  }
  const auth = res.headers.get("set-auth") || json?.Auth || json?.auth || null;
  const user_id = String(json?.UserID ?? json?.user_id ?? "");
  if (!auth || !user_id) {
    throw new Error(json?.msg || json?.message || "扫码登录未完成,二维码可能已失效,请重试");
  }
  return { user_id, auth };
}

function authHeaders(cred: Credential) {
  return {
    "User-Agent": UA,
    Authorization: `Bearer ${cred.auth}`,
    "X-User-Id": cred.user_id,
  };
}

/**
 * 3. 课程列表。
 * 注意:雨课堂课程接口需在真实登录态下实测确认(域名/参数),首次登录后会自动校准。
 */
export async function getCourses(cred: Credential): Promise<any[]> {
  // 候选接口,按优先级尝试
  const candidates = [
    `${YKT}/api/v3/user/courses`,
    `${YKT}/api/v3/user/course/list`,
    `${YKT}/v/course_meta/course/list`,
  ];
  let lastErr = "";
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: authHeaders(cred),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        lastErr = `${url} → HTTP ${res.status}`;
        continue;
      }
      const json = await res.json();
      if (json && (json.code === 0 || json.code == null)) {
        return extractCourses(json);
      }
      lastErr = `${url} → code=${json?.code} msg=${json?.msg || ""}`;
    } catch (e) {
      lastErr = `${url} → ${(e as Error).message}`;
    }
  }
  throw new Error(`课程接口探测失败: ${lastErr}`);
}

/** 从响应里提取课程数组(适配不同返回结构,登录后实测校准) */
function extractCourses(json: any): any[] {
  const candidates = [json?.data?.courses, json?.data?.list, json?.data, json?.courses, json?.list];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) return c;
  }
  return [];
}
