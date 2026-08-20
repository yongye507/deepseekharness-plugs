import { defineFeature } from "../../src/platform/feature";
import { api } from "./lib/api";
import { YuketangPage } from "./ui/YuketangPage";
import { ClassroomPage } from "./ui/ClassroomPage";

export const yuketang = defineFeature({
  name: "yuketang",
  title: "雨课堂",
  icon: "🎓",
  menu: { position: 20 },
  pages: [
    { path: "/features/yuketang", component: YuketangPage },
    { path: "/features/yuketang/classroom/[classroomId]", component: ClassroomPage },
  ],
  api,
});
