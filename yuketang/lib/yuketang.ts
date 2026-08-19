/**
 * 雨课堂 API 客户端。
 * 认证方式(已实测确认):
 *  - 扫码登录返回 { UserID, Auth } + Set-Cookie: sessionid=...(12 小时)
 *  - 业务请求只需带 Cookie: sessionid=xxx 即可通过认证
 */

const YKT = "https://www.yuketang.cn";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

export type Credential = {
  user_id: string;
  auth: string;
  session_id: string;
  /** Unix 毫秒 */
  expires_at: number;
};

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

/** 2. 长轮询等待扫码确认(挂起,成功后返回凭证含 sessionid) */
export async function pollScan(token: string): Promise<Credential> {
  const res = await fetch(`${YKT}/api/v3/user/login/app-web-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify({ token }),
    signal: AbortSignal.timeout(295_000),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // 响应可能为空
  }
  // 成功结构:{ code: 0, data: { UserID, Auth, Name, ... } },附带 Set-Cookie: sessionid
  const data = json?.data ?? {};
  const auth = data?.Auth || data?.auth || "";
  const user_id = String(data?.UserID ?? data?.user_id ?? "");
  // 解析 sessionid cookie
  const setCookie = res.headers.get("set-cookie") || "";
  const sessionMatch = setCookie.match(/sessionid=([^;]+)/);
  const maxAgeMatch = setCookie.match(/Max-Age=(\d+)/);
  const session_id = sessionMatch?.[1] || "";
  const expires_at =
    Date.now() + (maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 12 * 3600 * 1000);
  if (!session_id || !user_id) {
    const detail = text.slice(0, 300);
    throw new Error(
      `${json?.msg || json?.message || "扫码登录未完成"}(响应: ${detail || "(空)"})`,
    );
  }
  return { user_id, auth, session_id, expires_at };
}

function cookieHeaders(cred: Credential) {
  return {
    "User-Agent": UA,
    "X-Client": "h5",
    Cookie: `sessionid=${cred.session_id}`,
  };
}

export type YuketangCourse = {
  name: string;
  classrooms: { name: string; students_count?: number; course_id?: number }[];
  manage_permission?: boolean;
  update_time?: string;
};

/** 3. 课程列表(实测接口:GET /v/course_meta/my_courses) */
export async function getCourses(cred: Credential): Promise<YuketangCourse[]> {
  const res = await fetch(`${YKT}/v/course_meta/my_courses`, {
    headers: cookieHeaders(cred),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`课程接口 HTTP ${res.status}`);
  const json = await res.json();
  const courses = json?.data?.courses;
  if (!Array.isArray(courses)) {
    throw new Error(json?.msg || "课程接口返回异常");
  }
  return courses.map((c: any) => ({
    name: c.name || "未命名课程",
    manage_permission: c.manage_permission,
    update_time: c.update_time,
    classrooms: Array.isArray(c.classrooms)
      ? c.classrooms.map((cl: any) => ({
          name: cl.name || "",
          students_count: cl.students_count,
          course_id: cl.course?.id,
        }))
      : [],
  }));
}

/** 4. 用户信息 */
export async function getUserInfo(cred: Credential) {
  const res = await fetch(`${YKT}/v/course_meta/user_info`, {
    headers: cookieHeaders(cred),
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json();
  return json?.data?.user_profile ?? null;
}
