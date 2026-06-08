"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { subscribeGroups, Group } from "@/lib/gameStore";
import {
  subscribeMirrorControl,
  setActiveMirrorGroup,
  subscribeBroadcasterOnline,
  MirrorControl,
  defaultMirrorControl,
} from "@/lib/mirrorStore";

function GroupCard({
  groupId,
  group,
  isActive,
  onSelect,
}: {
  groupId: string;
  group: Group;
  isActive: boolean;
  onSelect: () => void;
}) {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    return subscribeBroadcasterOnline(groupId, setOnline);
  }, [groupId]);

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`rounded-2xl p-6 text-left shadow-md transition ${
        isActive
          ? "bg-teal-500 text-white ring-4 ring-teal-300"
          : "bg-white text-gray-800 hover:bg-teal-50"
      }`}
    >
      <div className="text-3xl font-black">{group.name}</div>
      <div className={`mt-2 text-sm ${isActive ? "text-teal-100" : "text-gray-500"}`}>
        {online ? "화면 공유 준비됨" : "공유 대기 중"}
      </div>
      {isActive && <div className="mt-3 text-sm font-semibold">전체 학생에게 이 화면 전송 중</div>}
    </motion.button>
  );
}

export default function MirrorControlClient() {
  const router = useRouter();
  const [groups, setGroups] = useState<Record<string, Group>>({});
  const [control, setControl] = useState<MirrorControl>(defaultMirrorControl);

  useEffect(() => {
    return subscribeGroups(setGroups);
  }, []);

  useEffect(() => {
    return subscribeMirrorControl(setControl);
  }, []);

  const handleSelect = async (groupId: string, groupName: string) => {
    if (control.activeGroupId === groupId) {
      await setActiveMirrorGroup(null, null);
    } else {
      await setActiveMirrorGroup(groupId, groupName);
    }
  };

  const groupEntries = Object.entries(groups);

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-teal-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-indigo-600">화면 미러링 제어</div>
            <h1 className="text-3xl font-bold text-gray-800">모둠 화면 선택</h1>
            <p className="mt-2 text-gray-600">
              학생 페이지에 입장한 모둠이 아래에 표시됩니다. 모둠을 클릭하면{" "}
              <code className="rounded bg-white px-1">/student/watch</code>에 있는 모든 학생이 해당 모둠
              화면을 봅니다.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/control-x7q9")}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow"
            >
              게임으로
            </button>
            <button
              onClick={async () => {
                await fetch("/api/teacher-auth", { method: "DELETE", credentials: "same-origin" });
                router.push("/control-x7q9/login");
              }}
              className="rounded-xl bg-gray-800 px-4 py-2 text-sm font-semibold text-white"
            >
              로그아웃
            </button>
          </div>
        </div>

        {control.activeGroupId && (
          <div className="mb-6 rounded-2xl bg-teal-600 p-4 text-center text-white shadow-lg">
            <div className="text-sm opacity-80">현재 전송 중</div>
            <div className="text-2xl font-bold">{control.activeGroupName}</div>
            <button
              onClick={() => void setActiveMirrorGroup(null, null)}
              className="mt-3 rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/30"
            >
              전송 중지
            </button>
          </div>
        )}

        {groupEntries.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center text-gray-500 shadow">
            아직 입장한 모둠이 없습니다. 학생들이 <code>/student</code>에서 모둠에 입장하면 여기에 표시됩니다.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groupEntries.map(([groupId, group]) => (
              <GroupCard
                key={groupId}
                groupId={groupId}
                group={group}
                isActive={control.activeGroupId === groupId}
                onSelect={() => void handleSelect(groupId, group.name)}
              />
            ))}
          </div>
        )}

        <div className="mt-8 rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-3 font-bold text-gray-700">접속 주소 안내</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>
              <span className="font-semibold text-gray-800">학생 입장:</span>{" "}
              <code>/student</code>
            </li>
            <li>
              <span className="font-semibold text-gray-800">모둠 화면 보기:</span>{" "}
              <code>/student/watch</code>
            </li>
            <li>
              <span className="font-semibold text-gray-800">모둠 태블릿 공유:</span>{" "}
              <code>/student/share</code>
            </li>
            <li>
              <span className="font-semibold text-gray-800">교사 제어:</span>{" "}
              <code>/control-x7q9/mirror</code> (현재 페이지)
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
