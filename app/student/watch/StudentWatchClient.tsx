"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  subscribeMirrorControl,
  subscribeBroadcasterOnline,
  MirrorControl,
  defaultMirrorControl,
} from "@/lib/mirrorStore";
import { useMirrorViewer } from "@/lib/useMirrorViewer";
import { useStudentGroup } from "@/lib/useStudentGroup";

export default function StudentWatchClient() {
  const router = useRouter();
  const { groupName, joined, sessionLoaded, groupsLoaded } = useStudentGroup();
  const [control, setControl] = useState<MirrorControl>(defaultMirrorControl);
  const [broadcasterOnline, setBroadcasterOnline] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { stream, status } = useMirrorViewer(control.activeGroupId);

  useEffect(() => {
    return subscribeMirrorControl(setControl);
  }, []);

  useEffect(() => {
    if (!control.activeGroupId) {
      setBroadcasterOnline(false);
      return;
    }
    return subscribeBroadcasterOnline(control.activeGroupId, setBroadcasterOnline);
  }, [control.activeGroupId]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (sessionLoaded && groupsLoaded && !joined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 p-6">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
          <div className="mb-4 text-5xl">🎓</div>
          <h1 className="text-xl font-bold text-gray-800">먼저 모둠에 입장해 주세요</h1>
          <p className="mt-2 text-sm text-gray-500">
            학생 페이지에서 모둠에 입장한 뒤, 이 화면에서 다른 모둠 화면을 볼 수 있습니다.
          </p>
          <button
            onClick={() => router.push("/student")}
            className="mt-6 w-full rounded-xl bg-pink-500 py-3 font-bold text-white hover:bg-pink-600"
          >
            학생 입장으로 이동
          </button>
        </div>
      </main>
    );
  }

  const groupLabel = control.activeGroupName ?? control.activeGroupId;

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="absolute left-0 right-0 top-0 z-10 bg-gradient-to-b from-black/80 to-transparent px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div>
            <button
              onClick={() => router.push("/student")}
              className="mb-1 text-sm text-white/60 hover:text-white"
            >
              ← {groupName || "학생"}
            </button>
            {groupLabel ? (
              <div className="text-lg font-bold">{groupLabel} 화면 보는 중</div>
            ) : (
              <div className="text-lg font-bold text-white/60">선생님이 모둠을 선택할 때까지 대기</div>
            )}
          </div>
          <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
            {status === "connected"
              ? "실시간 연결됨"
              : status === "connecting"
                ? "연결 중..."
                : broadcasterOnline
                  ? "화면 준비됨"
                  : "공유 대기 중"}
          </div>
        </div>
      </header>

      <div className="flex min-h-screen items-center justify-center p-4 pt-20">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-h-[calc(100vh-5rem)] w-full max-w-6xl rounded-xl bg-black object-contain shadow-2xl"
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md rounded-2xl bg-white/10 p-8 text-center backdrop-blur"
          >
            <div className="mb-4 text-5xl">
              {!control.activeGroupId ? "📺" : broadcasterOnline ? "🔗" : "⏳"}
            </div>
            <h1 className="text-xl font-bold">
              {!control.activeGroupId
                ? "선생님이 모둠을 선택하면 화면이 나타납니다"
                : broadcasterOnline
                  ? `${groupLabel} 화면에 연결 중...`
                  : `${groupLabel} 태블릿에서 화면 공유를 시작해 주세요`}
            </h1>
          </motion.div>
        )}
      </div>
    </main>
  );
}
