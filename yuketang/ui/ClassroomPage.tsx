"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { RouteParams } from "../../../src/platform/feature";

type Leaf = {
  id: number;
  name: string;
  leaf_type: number;
  is_locked: boolean;
  progress: number | { status?: string } | null;
};
type Section = { id: number; name: string; leaf_list: Leaf[] };
type Chapter = { id: number; name: string; section_leaf_list: Section[] };

type ProgressData = {
  courseName: string;
  classroomName: string;
  chapters: Chapter[];
  nextToLearn: {
    chapterName: string;
    sectionName: string;
    leafName: string;
    leafType: number;
  } | null;
};

function leafState(l: Leaf): "done" | "todo" | "absent" | "locked" {
  if (l.is_locked) return "locked";
  const p = l.progress;
  if (p == null) return "todo";
  if (typeof p === "number") return p >= 1 ? "done" : "todo";
  const status = String(p.status || "");
  if (status === "") return "todo";
  if (["缺勤", "未交", "未出勤", "待出勤"].includes(status)) return "absent";
  return "done";
}

const LEAF_ICON: Record<number, string> = {
  0: "📄",
  1: "📝",
  2: "🎥",
  3: "🎬",
  4: "❓",
  5: "🧾",
  6: "🎧",
  8: "📺",
};

export function ClassroomPage({ params }: { params: RouteParams }) {
  const classroomId = params.classroomId ?? "";
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/features/yuketang/classroom/${encodeURIComponent(classroomId)}/progress`,
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (res.status === 401) {
          window.location.href = "/features/yuketang";
          return;
        }
        throw new Error(json.error || "加载失败");
      }
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-sm text-neutral-500">加载课程进度…</p>;
  if (error)
    return (
      <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
        ⚠ {error}
      </div>
    );
  if (!data) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/features/yuketang" className="text-sm text-neutral-400 hover:text-indigo-300">
          ← 课程列表
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{data.courseName}</h1>
        <p className="text-sm text-neutral-500">{data.classroomName}</p>
      </div>

      {/* 接下来要学 */}
      <div className="rounded-xl border border-indigo-800/60 bg-indigo-950/40 p-4">
        <div className="text-xs font-medium text-indigo-300">📌 接下来要学</div>
        {data.nextToLearn ? (
          <div className="mt-1 text-base text-neutral-100">
            <span className="font-medium">{data.nextToLearn.leafName}</span>
            <span className="ml-2 text-sm text-neutral-400">
              {data.nextToLearn.chapterName} · {data.nextToLearn.sectionName}
            </span>
          </div>
        ) : (
          <div className="mt-1 text-emerald-400">🎉 全部完成!</div>
        )}
      </div>

      {/* 章节树 */}
      <div className="space-y-4">
        {data.chapters.map((ch) => (
          <div key={ch.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="font-medium text-neutral-100">{ch.name}</div>
            <div className="mt-2 space-y-3">
              {ch.section_leaf_list.map((sec) => (
                <div key={sec.id}>
                  <div className="text-sm text-neutral-400">{sec.name}</div>
                  <div className="mt-1 space-y-0.5">
                    {sec.leaf_list.map((leaf) => {
                      const st = leafState(leaf);
                      const icon = LEAF_ICON[leaf.leaf_type] ?? "📄";
                      return (
                        <div
                          key={leaf.id}
                          className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${
                            st === "done"
                              ? "text-neutral-500"
                              : st === "todo"
                                ? "text-neutral-200"
                                : st === "absent"
                                  ? "text-red-400"
                                  : "text-neutral-600"
                          }`}
                        >
                          <span className="w-5">{icon}</span>
                          <span className={st === "done" ? "line-through" : ""}>{leaf.name}</span>
                          <span className="ml-auto text-xs">
                            {st === "done" && "✓ 已完成"}
                            {st === "todo" && "· 未学"}
                            {st === "absent" && "⚠ 缺勤"}
                            {st === "locked" && "🔒"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
