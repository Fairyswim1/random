"use client";

import dynamic from "next/dynamic";

const MirrorControlClient = dynamic(() => import("../../MirrorControlClient"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-indigo-50 text-gray-400">
      로딩 중...
    </div>
  ),
});

export default function MirrorControlPage() {
  return <MirrorControlClient />;
}
