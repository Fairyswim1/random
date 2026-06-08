"use client";

import dynamic from "next/dynamic";

const StudentWatchClient = dynamic(() => import("./StudentWatchClient"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-black text-white/60">
      로딩 중...
    </div>
  ),
});

export default function StudentWatchPage() {
  return <StudentWatchClient />;
}
