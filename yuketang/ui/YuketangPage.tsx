"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

const API = "/api/features/yuketang";

type Classroom = { name: string; students_count?: number; course_id?: number };
type Course = { name: string; classrooms: Classroom[]; manage_permission?: boolean; update_time?: string };
type Profile = { name?: string; nickname?: string; school?: string };

export function YuketangPage() {
  const [state, setState] = useState<"checking" | "login" | "ready">("checking");
  const [qrImage, setQrImage] = useState("");
  const [waitingScan, setWaitingScan] = useState(false);
  const [scanError, setScanError] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [coursesError, setCoursesError] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const polledRef = useRef(false);

  const loadCourses = useCallback(async () => {
    setLoadingCourses(true);
    setCoursesError("");
    try {
      const [cres, pres] = await Promise.all([
        fetch(`${API}/courses`),
        fetch(`${API}/profile`),
      ]);
      const cdata = await cres.json();
      const pdata = await pres.json();
      if (!cres.ok || !cdata.ok) {
        if (cres.status === 401) {
          setState("login");
          return;
        }
        throw new Error(cdata.error || "课程加载失败");
      }
      setCourses(Array.isArray(cdata.courses) ? cdata.courses : []);
      if (pdata.ok && pdata.profile) setProfile(pdata.profile);
    } catch (e) {
      setCoursesError((e as Error).message);
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  // 初始化:检查登录状态
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/status`);
        const data = await res.json();
        if (data.loggedIn) {
          setExpiresAt(data.expiresAt);
          setState("ready");
          void loadCourses();
        } else {
          setState("login");
        }
      } catch {
        setState("login");
      }
    })();
  }, [loadCourses]);

  // 发起登录:取二维码 → 显示 → 长轮询等扫码
  const startLogin = useCallback(async () => {
    setScanError("");
    setQrImage("");
    setWaitingScan(true);
    polledRef.current = false;
    try {
      const res = await fetch(`${API}/qrcode`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "获取二维码失败");
      const img = await QRCode.toDataURL(data.qrContent, { width: 240, margin: 2 });
      setQrImage(img);

      if (polledRef.current) return;
      polledRef.current = true;
      // 长轮询:挂起直到扫码确认(约 5 分钟超时)
      const pollRes = await fetch(`${API}/poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: data.token }),
      });
      const pollData = await pollRes.json();
      if (!pollRes.ok || !pollData.ok) throw new Error(pollData.error || "登录失败");
      setState("ready");
      void loadCourses();
    } catch (e) {
      setScanError((e as Error).message);
      setWaitingScan(false);
    }
  }, [loadCourses]);

  async function logout() {
    await fetch(`${API}/logout`, { method: "POST" });
    setState("login");
    setCourses([]);
    setProfile(null);
    setQrImage("");
    setWaitingScan(false);
    polledRef.current = false;
  }

  // ---- 已登录:课程列表 ----
  if (state === "ready") {
    const expireIn =
      expiresAt != null ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 3600_000)) : null;
    return (
      <div className="max-w-4xl space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">雨课堂 · 我的课程</h1>
          {profile?.name && (
            <span className="rounded bg-neutral-800 px-2 py-0.5 text-sm text-neutral-300">
              {profile.name}
              {profile.school ? ` · ${profile.school}` : ""}
            </span>
          )}
          <button
            onClick={() => void logout()}
            className="ml-auto rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-red-500 hover:text-red-300"
          >
            退出登录
          </button>
        </div>
        {expireIn != null && (
          <p className="text-xs text-neutral-500">
            ⏳ 会话约 {expireIn} 小时后过期,过期后需重新扫码
          </p>
        )}
        {loadingCourses && <p className="text-sm text-neutral-500">加载课程中…</p>}
        {coursesError && (
          <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            ⚠ {coursesError}
          </div>
        )}
        {!loadingCourses && !coursesError && courses.length === 0 && (
          <p className="text-sm text-neutral-500">还没有课程。</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {courses.map((c, i) => (
            <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="font-medium text-neutral-100">{c.name}</div>
              <div className="mt-2 space-y-1">
                {c.classrooms.length === 0 && (
                  <div className="text-sm text-neutral-500">(无班级)</div>
                )}
                {c.classrooms.map((cl, j) => (
                  <div key={j} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-300">{cl.name}</span>
                    {cl.students_count != null && (
                      <span className="text-xs text-neutral-500">{cl.students_count} 人</span>
                    )}
                  </div>
                ))}
              </div>
              {c.manage_permission && (
                <div className="mt-2 text-xs text-indigo-400/70">我是课程管理员</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- 未登录:扫码 ----
  return (
    <div className="max-w-md space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">雨课堂 · 扫码登录</h1>
        <p className="mt-1 text-sm text-neutral-500">用微信扫描二维码,确认后自动登录</p>
      </div>

      <div className="flex flex-col items-center rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        {qrImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrImage} alt="登录二维码" className="h-60 w-60 rounded-lg bg-white p-2" />
            <p className="mt-3 text-sm text-neutral-400">
              {waitingScan ? "等待扫码确认…(二维码 5 分钟内有效)" : "二维码已失效,请刷新"}
            </p>
          </>
        ) : (
          <button
            onClick={() => void startLogin()}
            disabled={waitingScan}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {waitingScan ? "正在获取二维码…" : "获取登录二维码"}
          </button>
        )}
        {scanError && <p className="mt-3 text-sm text-red-400">⚠ {scanError}</p>}
        {qrImage && (
          <button
            onClick={() => void startLogin()}
            className="mt-3 text-xs text-neutral-500 hover:text-neutral-300"
          >
            刷新二维码
          </button>
        )}
      </div>
    </div>
  );
}
