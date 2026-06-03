"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NumberLine from "@/components/NumberLine";
import LeaderBoard from "@/components/LeaderBoard";
import {
  subscribeGameState,
  subscribeGroups,
  updateGameState,
  setGameState,
  processResults,
  resetBets,
  resetAllGroups,
  GameState,
  Group,
  defaultGameState,
} from "@/lib/gameStore";
import { useRouter } from "next/navigation";

type CoinResult = "heads" | "tails";

export default function TeacherPage() {
  const router = useRouter();
  const [gameState, setGameStateLocal] = useState<GameState>(defaultGameState);
  const [groups, setGroups] = useState<{ [id: string]: Group }>({});
  const [numFlips, setNumFlips] = useState(5);
  // 전체 소요시간 ~5초 고정, 횟수가 많을수록 한 번당 빠름 (최소 100ms)
  const flipInterval = Math.max(100, Math.round(5000 / numFlips));
  const transitionDuration = Math.max(0.08, flipInterval / 1000 * 0.7);
  const [isFlipping, setIsFlipping] = useState(false);
  const [coinResult, setCoinResult] = useState<CoinResult | null>(null);
  const [flipLog, setFlipLog] = useState<CoinResult[]>([]);
  const [lastMove, setLastMove] = useState<number | null>(null);
  const [showResultBanner, setShowResultBanner] = useState(false);
  const flippingRef = useRef(false);

  useEffect(() => {
    const unsub1 = subscribeGameState(setGameStateLocal);
    const unsub2 = subscribeGroups(setGroups);
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  const handleNewRound = async () => {
    await setGameState({
      ...defaultGameState,
      status: "betting",
      numFlips,
      round: (gameState.round || 0) + 1,
      bettingOpen: true,
    });
    await resetBets();
    setFlipLog([]);
    setCoinResult(null);
    setShowResultBanner(false);
  };

  const handleCloseBetting = async () => {
    await updateGameState({ bettingOpen: false, status: "flipping" });
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const handleFlipAll = useCallback(async () => {
    if (flippingRef.current) return;
    flippingRef.current = true;
    setIsFlipping(true);

    let pos = 0;
    const log: CoinResult[] = [];

    for (let i = 0; i < numFlips; i++) {
      const isHeads = Math.random() < 0.5;
      const move = isHeads ? 1 : -1;
      const result: CoinResult = isHeads ? "heads" : "tails";

      pos = Math.max(-10, Math.min(10, pos + move));
      log.push(result);

      setCoinResult(result);
      setLastMove(move);
      setFlipLog([...log]);

      await updateGameState({
        currentPosition: pos,
        flipHistory: log.map((r) => (r === "heads" ? 1 : -1)),
      });

      await sleep(flipInterval);
    }

    // Done
    await processResults(pos);
    await updateGameState({
      result: pos,
      status: "results",
      currentPosition: pos,
    });

    setIsFlipping(false);
    setShowResultBanner(true);
    flippingRef.current = false;
  }, [numFlips, flipInterval]);

  const handleReset = async () => {
    if (!confirm("모든 조의 데이터를 초기화하시겠습니까?")) return;
    await resetAllGroups();
    await setGameState(defaultGameState);
    setFlipLog([]);
    setCoinResult(null);
    setShowResultBanner(false);
  };

  const submittedCount = Object.values(groups).filter((g) => g.submitted).length;
  const totalGroups = Object.values(groups).length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-indigo-700 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-indigo-200 hover:text-white transition text-sm">
            ← 홈
          </button>
          <h1 className="text-xl font-bold">👩‍🏫 교사 대시보드</h1>
          <span className="bg-indigo-500 px-3 py-0.5 rounded-full text-sm">라운드 {gameState.round}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className={`px-3 py-1 rounded-full font-semibold ${
            gameState.status === "idle" ? "bg-gray-400" :
            gameState.status === "betting" ? "bg-yellow-400 text-yellow-900" :
            gameState.status === "flipping" ? "bg-orange-400" :
            "bg-green-400 text-green-900"
          }`}>
            {gameState.status === "idle" ? "대기 중" :
             gameState.status === "betting" ? "베팅 진행 중" :
             gameState.status === "flipping" ? "동전 던지는 중" :
             "결과 발표"}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">

        {/* ① 수직선 - 풀 너비 */}
        <div className="bg-white rounded-2xl shadow-md px-8 py-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-gray-700">📍 수직선 (랜덤워크)</h2>
            <div className="flex items-center gap-3">
              {coinResult && (
                <motion.div
                  key={flipLog.length}
                  animate={{ rotateY: [0, 360] }}
                  transition={{ duration: 0.35 }}
                  className={`text-2xl font-bold ${coinResult === "heads" ? "text-yellow-600" : "text-blue-600"}`}
                >
                  {coinResult === "heads" ? "☀️ 앞면 +1" : "🌙 뒷면 -1"}
                </motion.div>
              )}
              <span className="text-sm text-gray-500">현재 위치</span>
              <span className="font-black text-4xl text-indigo-600">{gameState.currentPosition}</span>
            </div>
          </div>
          <NumberLine
            position={gameState.currentPosition}
            isAnimating={isFlipping}
            lastMove={lastMove}
            transitionDuration={transitionDuration}
          />
        </div>

        {/* Result Banner */}
        <AnimatePresence>
          {showResultBanner && gameState.status === "results" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl px-8 py-5 text-white shadow-lg flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <span className="text-5xl">🎯</span>
                <div>
                  <div className="text-2xl font-bold">최종 위치: {gameState.result}번</div>
                  <div className="text-lg opacity-90">
                    {Object.values(groups).filter((g) => (g.bets?.[String(gameState.result)] ?? 0) > 0).length > 0
                      ? `정답 조: ${Object.values(groups).filter((g) => (g.bets?.[String(gameState.result)] ?? 0) > 0).map((g) => g.name).join(", ")}`
                      : "정답 조 없음"}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ② 하단: 제어판 + 동전기록 + 순위표 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* 게임 제어 */}
          <div className="bg-white rounded-2xl shadow-md p-5 space-y-4">
            <h2 className="text-lg font-bold text-gray-700">🎮 게임 제어</h2>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">동전 던질 횟수</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={numFlips}
                  onChange={(e) => {
                    const v = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                    setNumFlips(v);
                  }}
                  className="w-24 border-2 border-indigo-300 rounded-xl px-3 py-2 text-xl font-bold text-indigo-700 text-center focus:outline-none focus:border-indigo-500"
                  disabled={gameState.status === "flipping"}
                />
                <span className="text-sm text-gray-500">회</span>
              </div>
              <div className="mt-1 text-xs text-gray-400">
                한 번당 {flipInterval}ms · 총 약 {Math.round(flipInterval * numFlips / 1000)}초
              </div>
            </div>

            {gameState.status === "betting" && (
              <div className="bg-yellow-50 rounded-xl p-3 text-sm text-yellow-800">
                <div className="font-semibold">베팅 현황 {submittedCount}/{totalGroups}조</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(groups).map(([id, g]) => (
                    <span key={id} className={`px-2 py-0.5 rounded-full text-xs font-medium ${g.submitted ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-600"}`}>
                      {g.name} {g.submitted ? "✓" : "…"}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {(gameState.status === "idle" || gameState.status === "results") && (
                <button onClick={handleNewRound} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition shadow">
                  🎲 새 라운드 시작
                </button>
              )}
              {gameState.status === "betting" && (
                <button onClick={handleCloseBetting} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition shadow">
                  🔒 베팅 마감
                </button>
              )}
              {gameState.status === "flipping" && !isFlipping && (
                <button onClick={handleFlipAll} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition shadow animate-pulse">
                  🪙 동전 던지기 시작!
                </button>
              )}
              {isFlipping && (
                <div className="w-full bg-gray-100 text-gray-500 font-bold py-3 rounded-xl text-center text-sm">
                  ⏳ 던지는 중... ({flipLog.length}/{numFlips})
                </div>
              )}
              <button onClick={handleReset} className="w-full bg-red-100 hover:bg-red-200 text-red-600 font-medium py-2 rounded-xl transition text-sm">
                🗑️ 전체 초기화
              </button>
            </div>
          </div>

          {/* 동전 기록 */}
          <div className="bg-white rounded-2xl shadow-md p-5">
            <h3 className="font-bold text-gray-700 mb-3">🪙 동전 기록</h3>
            {flipLog.length === 0 ? (
              <div className="text-gray-300 text-sm text-center py-8">동전을 던지면 여기에 기록됩니다</div>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                  {flipLog.map((r, i) => (
                    <motion.span
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-base shadow
                        ${r === "heads" ? "bg-yellow-100 text-yellow-600" : "bg-blue-100 text-blue-600"}`}
                    >
                      {r === "heads" ? "☀️" : "🌙"}
                    </motion.span>
                  ))}
                </div>
                <div className="mt-3 text-sm text-gray-500 flex gap-4">
                  <span>☀️ {flipLog.filter((r) => r === "heads").length}회</span>
                  <span>🌙 {flipLog.filter((r) => r === "tails").length}회</span>
                </div>
              </>
            )}
          </div>

          {/* 순위표 */}
          <div className="bg-white rounded-2xl shadow-md p-5">
            <h2 className="text-lg font-bold text-gray-700 mb-3">🏆 순위표</h2>
            <LeaderBoard
              groups={groups}
              result={gameState.status === "results" ? gameState.result : null}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
