"use client";

import dynamic from "next/dynamic";

const StudentShareClient = dynamic(() => import("./StudentShareClient"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-pink-50 text-gray-400">
      로딩 중...
    </div>
  ),
});

export default function StudentSharePage() {
  return <StudentShareClient />;
}
