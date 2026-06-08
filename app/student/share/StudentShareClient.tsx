"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { subscribeMirrorControl, MirrorControl, defaultMirrorControl } from "@/lib/mirrorStore";
import { useMirrorBroadcaster } from "@/lib/useMirrorBroadcaster";
import { useStudentGroup } from "@/lib/useStudentGroup";

export default function StudentShareClient() {
  const router = useRouter();
  const { groupId, groupName, joined, sessionLoaded, groupsLoaded } = useStudentGroup();
  const [control, setControl] = useState<MirrorControl>(defaultMirrorControl);

  const isActive = joined && control.activeGroupId === groupId;
  const { sharing, error, startSharing, stopSharing } = useMirrorBroadcaster(
    joined ? groupId : null,
    isActive
  );

  useEffect(() => {
    return subscribeMirrorControl(setControl);
  }, []);

  if (sessionLoaded && groupsLoaded && !joined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 p-6">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
          <div className="mb-4 text-5xl">📱</div>
          <h1 className="text-xl font-bold text-gray-800">먼저 모둠에 입장해 주세요</h1>
          <p className="mt-2 text-sm text-gray-500">
            학생 페이지에서 모둠에 입장한 뒤, 이 태블릿에서 화면을 공유할 수 있습니다.
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

  if (!joined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 text-gray-400">
        로딩 중...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-6">
      <div className="mx-auto max-w-lg">
        <button
          onClick={() => router.push("/student")}
          className="mb-6 text-sm text-pink-600 hover:text-pink-800"
        >
          ← {groupName} (학생 페이지)
        </button>

        <div className="mb-8 text-center">
          <div className="mb-3 text-5xl">📱</div>
          <h1 className="text-2xl font-bold text-gray-800">{groupName} 화면 공유</h1>
          <p className="mt-2 text-sm text-gray-500">
            이 태블릿 화면을 선생님이 선택하면 전체 학생에게 보여집니다.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div
            className={`rounded-2xl p-5 shadow-md ${
              isActive ? "bg-teal-500 text-white" : "bg-white text-gray-800"
            }`}
          >
            <div className={`text-sm ${isActive ? "text-teal-100" : "text-gray-500"}`}>
              {isActive ? "선생님이 이 모둠을 선택했습니다" : "선생님이 이 모둠을 선택하면 공유가 시작됩니다"}
            </div>
            {!isActive && control.activeGroupName && (
              <div className={`mt-1 text-sm ${isActive ? "" : "text-gray-400"}`}>
                지금은 {control.activeGroupName} 화면이 보이는 중입니다.
              </div>
            )}
          </div>

          {!sharing ? (
            <button
              onClick={() => void startSharing()}
              className="w-full rounded-2xl bg-teal-500 py-4 text-lg font-bold text-white shadow-lg hover:bg-teal-400"
            >
              화면 공유 시작
            </button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl bg-green-50 p-4 text-center shadow-md">
                <div className="text-3xl">🟢</div>
                <div className="mt-2 font-bold text-green-800">화면 공유 중</div>
                <div className="mt-1 text-sm text-green-600">
                  {isActive
                    ? "학생들이 이 화면을 보고 있습니다"
                    : "선생님이 이 모둠을 선택하면 학생들에게 전달됩니다"}
                </div>
              </div>
              <button
                onClick={() => void stopSharing()}
                className="w-full rounded-xl bg-red-500 py-3 font-semibold text-white hover:bg-red-600"
              >
                공유 중지
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
