"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NumberLine from "@/components/NumberLine";
import {
  subscribeGameState,
  subscribeGroups,
  registerGroup,
  submitBet,
  GameState,
  Group,
  GroupBet,
  defaultGameState,
} from "@/lib/gameStore";
import { useRouter } from "next/navigation";

const POSITIONS = Array.from({ length: 21 }, (_, i) => i - 10);

export default function StudentPage() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>(defaultGameState);
  const [groups, setGroups] = useState<{ [id: string]: Group }>({});

  // Group setup
  const [groupId, setGroupId] = useState<string>("");
  const [groupName, setGroupName] = useState<string>("");
  const [joined, setJoined] = useState(false);
  const [groupIdInput, setGroupIdInput] = useState("");
  const [groupNameInput, setGroupNameInput] = useState("");

  // Betting
  const [bets, setBets] = useState<GroupBet>({});
  const [betError, setBetError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub1 = subscribeGameState(setGameState);
    const unsub2 = subscribeGroups(setGroups);
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  // Restore joined state from sessionStorage
  useEffect(() => {
    const savedId = sessionStorage.getItem("groupId");
    const savedName = sessionStorage.getItem("groupName");
    if (savedId && savedName) {
      setGroupId(savedId);
      setGroupName(savedName);
      setJoined(true);
    }
  }, []);

  // Reset bets when new round starts
  useEffect(() => {
    setBets({});
    setBetError("");
  }, [gameState.round]);

  const myGroup: Group | null = joined ? groups[groupId] ?? null : null;

  const handleJoin = async () => {
    if (!groupIdInput.trim() || !groupNameInput.trim()) {
      setBetError("조 번호와 조 이름을 입력하세요");
      return;
    }
    await registerGroup(groupIdInput.trim(), groupNameInput.trim());
    setGroupId(groupIdInput.trim());
    setGroupName(groupNameInput.trim());
    sessionStorage.setItem("groupId", groupIdInput.trim());
    sessionStorage.setItem("groupName", groupNameInput.trim());
    setJoined(true);
    setBetError("");
  };

  const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);
  const availableCoins = (myGroup?.coins ?? 10) - totalBet;

  const handleBetChange = (pos: number, value: number) => {
    const current = bets[pos.toString()] ?? 0;
    const delta = value - current;
    if (delta > 0 && availableCoins < delta) return;
    if (value < 0) return;
    setBets((prev) => ({ ...prev, [pos.toString()]: value }));
  };

  const handleSubmit = async () => {
    if (totalBet === 0) {
      setBetError("최소 1코인 이상 배팅하세요");
      return;
    }
    if (totalBet > (myGroup?.coins ?? 0)) {
      setBetError("코인이 부족합니다");
      return;
    }
    setSubmitting(true);
    try {
      const activeBets: GroupBet = {};
      Object.entries(bets).forEach(([k, v]) => {
        if (v > 0) activeBets[k] = v;
      });
      await submitBet(groupId, activeBets);
      setBetError("");
    } catch (e: unknown) {
      setBetError(e instanceof Error ? e.message : "오류가 발생했습니다");
    }
    setSubmitting(false);
  };

  // Status displays
  if (!joined) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md"
        >
          <div className="text-center mb-6">
            <div className="text-6xl mb-3">🎓</div>
            <h1 className="text-2xl font-bold text-gray-800">학생 입장</h1>
            <p className="text-gray-500 text-sm mt-1">조 번호와 이름을 입력하세요</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">조 번호</label>
              <input
                type="text"
                value={groupIdInput}
                onChange={(e) => setGroupIdInput(e.target.value)}
                placeholder="예: 1, 2, 3..."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-400 text-gray-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">조 이름</label>
              <input
                type="text"
                value={groupNameInput}
                onChange={(e) => setGroupNameInput(e.target.value)}
                placeholder="예: 꿈나무 조"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-400 text-gray-800"
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
            </div>
            {betError && <p className="text-red-500 text-sm">{betError}</p>}
            <button
              onClick={handleJoin}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl transition shadow-md"
            >
              입장하기 🚪
            </button>
          </div>
          <div className="mt-4 text-center">
            <button onClick={() => router.push("/")} className="text-sm text-gray-400 hover:text-gray-600">
              ← 홈으로
            </button>
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <div className="bg-pink-600 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-pink-200 hover:text-white text-sm">
            ← 홈
          </button>
          <h1 className="text-xl font-bold">🎓 {groupName}</h1>
          <span className="bg-pink-500 px-3 py-0.5 rounded-full text-sm">라운드 {gameState.round}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-yellow-300">🪙</span>
          <span className="font-bold text-xl">{myGroup?.coins ?? 10}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Number Line (read-only) */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <h2 className="font-bold text-gray-700 mb-3">📍 현재 수직선 상태</h2>
          <NumberLine
            position={gameState.currentPosition}
            isAnimating={gameState.status === "flipping"}
            lastMove={null}
          />
          <div className="mt-2 text-center text-sm text-gray-500">
            {gameState.status === "flipping" && "🎲 동전이 던져지고 있어요!"}
            {gameState.status === "betting" && gameState.bettingOpen && "💭 어느 위치를 예측하나요?"}
            {gameState.status === "results" && `🎯 최종 위치: ${gameState.result}번`}
          </div>
        </div>

        {/* Status-based content */}
        <AnimatePresence mode="wait">
          {/* IDLE */}
          {gameState.status === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl shadow-md p-8 text-center"
            >
              <div className="text-5xl mb-4">⏳</div>
              <div className="text-xl font-bold text-gray-600">게임 대기 중</div>
              <div className="text-gray-400 mt-2 text-sm">선생님이 게임을 시작할 때까지 기다려주세요</div>
            </motion.div>
          )}

          {/* BETTING */}
          {gameState.status === "betting" && !myGroup?.submitted && gameState.bettingOpen && (
            <motion.div
              key="betting"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-md p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-700 text-lg">🪙 베팅하기</h2>
                <div className="text-sm text-gray-500">
                  남은 코인: <span className="font-bold text-yellow-600 text-base">{availableCoins}</span>
                  <span className="text-yellow-400 ml-1">🪙</span>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                {gameState.numFlips}번 던진 후 캐릭터가 어느 위치에 있을지 예측하세요!
                여러 위치에 분할 배팅 가능합니다.
              </p>

              <div className="grid grid-cols-7 gap-1.5 mb-5">
                {POSITIONS.map((pos) => {
                  const betAmt = bets[pos.toString()] ?? 0;
                  return (
                    <div key={pos} className="flex flex-col items-center gap-1">
                      <div className={`text-xs font-mono font-bold ${
                        pos === 0 ? "text-indigo-600" : pos > 0 ? "text-green-600" : "text-red-500"
                      }`}>
                        {pos}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => handleBetChange(pos, betAmt + 1)}
                          disabled={availableCoins <= 0}
                          className="w-8 h-6 text-xs bg-pink-100 hover:bg-pink-200 rounded disabled:opacity-30 transition font-bold"
                        >
                          +
                        </button>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold
                          ${betAmt > 0 ? "bg-pink-500 text-white shadow" : "bg-gray-100 text-gray-400"}`}>
                          {betAmt > 0 ? betAmt : "·"}
                        </div>
                        <button
                          onClick={() => handleBetChange(pos, betAmt - 1)}
                          disabled={betAmt <= 0}
                          className="w-8 h-6 text-xs bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-30 transition font-bold"
                        >
                          -
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              {totalBet > 0 && (
                <div className="bg-pink-50 rounded-xl p-3 mb-3 text-sm">
                  <div className="font-semibold text-pink-700 mb-1">내 베팅 요약</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(bets)
                      .filter(([, v]) => v > 0)
                      .map(([pos, amt]) => (
                        <span key={pos} className="bg-pink-200 text-pink-800 px-2 py-0.5 rounded-full text-xs font-medium">
                          {pos}번 → {amt}🪙
                        </span>
                      ))}
                  </div>
                  <div className="mt-1 text-pink-600">총 베팅: {totalBet}코인</div>
                </div>
              )}

              {betError && <p className="text-red-500 text-sm mb-3">{betError}</p>}

              <button
                onClick={handleSubmit}
                disabled={submitting || totalBet === 0}
                className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition shadow"
              >
                {submitting ? "제출 중..." : "베팅 확정! 🎯"}
              </button>
            </motion.div>
          )}

          {/* Betting closed / waiting */}
          {gameState.status === "betting" && !gameState.bettingOpen && !myGroup?.submitted && (
            <motion.div
              key="closed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-orange-50 rounded-2xl shadow-md p-8 text-center"
            >
              <div className="text-5xl mb-3">🔒</div>
              <div className="text-xl font-bold text-orange-700">베팅이 마감되었습니다</div>
            </motion.div>
          )}

          {/* Submitted - waiting for flip */}
          {myGroup?.submitted && gameState.status !== "results" && (
            <motion.div
              key="submitted"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-50 rounded-2xl shadow-md p-8 text-center"
            >
              <div className="text-5xl mb-3">✅</div>
              <div className="text-xl font-bold text-green-700">베팅 완료!</div>
              <div className="text-green-600 mt-2 text-sm">동전 던지기를 기다리는 중...</div>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {Object.entries(myGroup.bets ?? {})
                  .filter(([, v]) => v > 0)
                  .map(([pos, amt]) => (
                    <span key={pos} className="bg-green-200 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      {pos}번 → {amt}🪙
                    </span>
                  ))}
              </div>
            </motion.div>
          )}

          {/* FLIPPING */}
          {gameState.status === "flipping" && (
            <motion.div
              key="flipping"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl shadow-md p-8 text-center"
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="text-6xl mb-4 inline-block"
              >
                🪙
              </motion.div>
              <div className="text-xl font-bold text-gray-700">동전이 날아가고 있어요!</div>
              <div className="text-sm text-gray-400 mt-2">
                {gameState.numFlips}번 중 {gameState.flipHistory?.length ?? 0}번 완료
              </div>
            </motion.div>
          )}

          {/* RESULTS */}
          {gameState.status === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              {/* Result card */}
              <div className={`rounded-2xl p-6 text-center shadow-lg ${
                (myGroup?.bets?.[String(gameState.result)] ?? 0) > 0
                  ? "bg-gradient-to-br from-yellow-300 to-orange-300"
                  : "bg-gradient-to-br from-gray-100 to-gray-200"
              }`}>
                <div className="text-5xl mb-3">
                  {(myGroup?.bets?.[String(gameState.result)] ?? 0) > 0 ? "🎉" : "😢"}
                </div>
                <div className="text-2xl font-bold text-gray-800">
                  최종 위치: {gameState.result}번
                </div>
                {(myGroup?.bets?.[String(gameState.result)] ?? 0) > 0 ? (
                  <div className="mt-3">
                    <div className="text-lg font-bold text-yellow-800">정답! 🏆</div>
                    <div className="text-sm text-yellow-700 mt-1">
                      +{(myGroup!.bets![String(gameState.result)]) * 2}코인 획득!
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-gray-500 text-sm">아쉽지만 다음 라운드에 도전하세요!</div>
                )}
              </div>

              {/* My coins */}
              <div className="bg-white rounded-2xl shadow-md p-5 text-center">
                <div className="text-sm text-gray-500 mb-1">내 보유 코인</div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl">🪙</span>
                  <span className="text-4xl font-bold text-yellow-600">{myGroup?.coins ?? 0}</span>
                </div>
                <div className="text-sm text-gray-400 mt-1">누적 획득: {myGroup?.totalWon ?? 0}코인</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
