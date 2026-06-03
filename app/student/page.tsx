"use client";
import dynamic from "next/dynamic";

const StudentClient = dynamic(() => import("./StudentClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
      <div className="text-gray-400 text-lg">로딩 중...</div>
    </div>
  ),
});

export default function Page() {
  return <StudentClient />;
}
