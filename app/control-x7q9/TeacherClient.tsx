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
  resetQuizAnswers,
  resetAllGroups,
  subscribeQuizAnswers,
  GameState,
  Group,
  QuizAnswers,
  defaultGameState,
  quizQuestions,
} from "@/lib/gameStore";
import { useRouter } from "next/navigation";

type CoinResult = "heads" | "tails";

export default function TeacherPage() {
  const router = useRouter();
  const [gameState, setGameStateLocal] = useState<GameState>(defaultGameState);
  const [groups, setGroups] = useState<{ [id: string]: Group }>({});
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswers>({});
  const [numFlips, setNumFlips] = useState(5);
  const [isFlipping, setIsFlipping] = useState(false);
  const [coinResult, setCoinResult] = useState<CoinResult | null>(null);
  const [flipLog, setFlipLog] = useState<CoinResult[]>([]);
  const [lastMove, setLastMove] = useState<number | null>(null);
  const [showResultBanner, setShowResultBanner] = useState(false);
  const flippingRef = useRef(false);

  useEffect(() => {
    const unsub1 = subscribeGameState(setGameStateLocal);
    const unsub2 = subscribeGroups(setGroups);
    const unsub3 = subscribeQuizAnswers(setQuizAnswers);
    return () => {
      unsub1();
      unsub2();
      unsub3();
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

      await sleep(800);
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
  }, [numFlips]);

  const handleReset = async () => {
    if (!confirm("모든 조의 데이터를 초기화하시겠습니까?")) return;
    await resetAllGroups();
    await setGameState(defaultGameState);
    setFlipLog([]);
    setCoinResult(null);
    setShowResultBanner(false);
  };

  const handleStartQuiz = async () => {
    await resetQuizAnswers();
    await updateGameState({ status: "quiz", quizIndex: 0, quizOpen: true });
  };

  const handlePrevQuiz = async () => {
    await updateGameState({ quizIndex: Math.max(0, (gameState.quizIndex ?? 0) - 1), quizOpen: true });
  };

  const handleNextQuiz = async () => {
    const nextIndex = Math.min(quizQuestions.length - 1, (gameState.quizIndex ?? 0) + 1);
    await updateGameState({ quizIndex: nextIndex, quizOpen: true });
  };

  const handleFinishQuiz = async () => {
    await updateGameState({ status: "results", quizOpen: false });
  };

  const submittedCount = Object.values(groups).filter((g) => g.submitted).length;
  const totalGroups = Object.values(groups).length;
  const currentQuizIndex = Math.min(gameState.quizIndex ?? 0, quizQuestions.length - 1);
  const currentQuiz = quizQuestions[currentQuizIndex];
  const currentQuizAnswers = Object.entries(groups).map(([groupId, group]) => ({
    groupId,
    group,
    answer: quizAnswers[groupId]?.[currentQuiz.id],
  }));
  const quizSubmittedCount = currentQuizAnswers.filter((item) => item.answer?.answer).length;

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
            gameState.status === "quiz" ? "bg-purple-400 text-purple-950" :
            "bg-green-400 text-green-900"
          }`}>
            {gameState.status === "idle" ? "대기 중" :
             gameState.status === "betting" ? "베팅 진행 중" :
             gameState.status === "flipping" ? "동전 던지는 중" :
             gameState.status === "quiz" ? "퀴즈 진행 중" :
             "결과 발표"}
          </span>
        </div>
      </div>

      {gameState.status === "quiz" ? (
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-sm font-semibold text-purple-600 mb-2">
                  퀴즈 {currentQuizIndex + 1} / {quizQuestions.length}
                </div>
                <h2 className="text-2xl font-bold text-gray-800">{currentQuiz.prompt}</h2>
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-700">
                    {currentQuiz.type === "ox" ? "OX 퀴즈" : "주관식"}
                  </span>
                  {currentQuiz.answer && (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                      정답: {currentQuiz.answer}
                    </span>
                  )}
                </div>
              </div>
              <div className="rounded-2xl bg-purple-50 px-5 py-4 text-center">
                <div className="text-sm text-purple-600">제출 현황</div>
                <div className="text-3xl font-bold text-purple-700">
                  {quizSubmittedCount} / {totalGroups}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={handlePrevQuiz}
                disabled={currentQuizIndex === 0}
                className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-200 disabled:opacity-40"
              >
                이전 문제
              </button>
              <button
                onClick={handleNextQuiz}
                disabled={currentQuizIndex === quizQuestions.length - 1}
                className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-40"
              >
                다음 문제
              </button>
              <button
                onClick={handleFinishQuiz}
                className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
              >
                퀴즈 마치고 결과 화면으로
              </button>
              <button
                onClick={handleReset}
                className="ml-auto rounded-xl bg-red-100 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-200"
              >
                전체 초기화
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-700 mb-4">모둠별 답안</h3>
            <div className="grid gap-3">
              {currentQuizAnswers.length === 0 ? (
                <div className="rounded-xl bg-gray-50 p-6 text-center text-gray-500">
                  아직 입장한 모둠이 없습니다.
                </div>
              ) : (
                currentQuizAnswers.map(({ groupId, group, answer }) => {
                  const isCorrect = currentQuiz.answer ? answer?.answer === currentQuiz.answer : null;
                  return (
                    <div
                      key={groupId}
                      className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="font-bold text-gray-800">{group.name}</div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          answer
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-200 text-gray-500"
                        }`}>
                          {answer ? "제출 완료" : "미제출"}
                        </span>
                      </div>
                      <div className="text-gray-700">
                        {answer?.answer ? answer.answer : "아직 답안이 없습니다."}
                      </div>
                      {isCorrect !== null && answer && (
                        <div className={`mt-2 text-sm font-semibold ${isCorrect ? "text-green-600" : "text-red-500"}`}>
                          {isCorrect ? "정답" : "오답"}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Number Line */}
        <div className="lg:col-span-2 space-y-4">
          {/* Number Line Card */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-700">📍 수직선 (랜덤워크)</h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>현재 위치:</span>
                <span className="font-bold text-2xl text-indigo-600">{gameState.currentPosition}</span>
              </div>
            </div>
            <NumberLine
              position={gameState.currentPosition}
              isAnimating={isFlipping}
              lastMove={lastMove}
            />
          </div>

          {/* Flip Log */}
          {flipLog.length > 0 && (
            <div className="bg-white rounded-2xl shadow-md p-5">
              <h3 className="font-bold text-gray-700 mb-3">🪙 동전 기록</h3>
              <div className="flex flex-wrap gap-2">
                {flipLog.map((r, i) => (
                  <motion.span
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-lg shadow
                      ${r === "heads" ? "bg-yellow-100 text-yellow-600" : "bg-blue-100 text-blue-600"}`}
                  >
                    {r === "heads" ? "☀️" : "🌙"}
                  </motion.span>
                ))}
              </div>
              <div className="mt-3 text-sm text-gray-500 flex gap-4">
                <span>앞면(+1): {flipLog.filter((r) => r === "heads").length}회</span>
                <span>뒷면(-1): {flipLog.filter((r) => r === "tails").length}회</span>
              </div>
            </div>
          )}

          {/* Result Banner */}
          <AnimatePresence>
            {showResultBanner && gameState.status === "results" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-6 text-white shadow-lg text-center"
              >
                <div className="text-5xl mb-2">🎯</div>
                <div className="text-2xl font-bold">
                  최종 위치: {gameState.result}번
                </div>
                <div className="text-lg mt-1 opacity-90">
                  {Object.values(groups).filter(
                    (g) => (g.bets?.[String(gameState.result)] ?? 0) > 0
                  ).length > 0
                    ? `정답 조: ${Object.values(groups)
                        .filter((g) => (g.bets?.[String(gameState.result)] ?? 0) > 0)
                        .map((g) => g.name)
                        .join(", ")}`
                    : "정답 조 없음"}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Controls + Leaderboard */}
        <div className="space-y-4">
          {/* Control Panel */}
          <div className="bg-white rounded-2xl shadow-md p-5 space-y-4">
            <h2 className="text-lg font-bold text-gray-700">🎮 게임 제어</h2>

            {/* Flip count */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                동전 던질 횟수
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={numFlips}
                  onChange={(e) => setNumFlips(Number(e.target.value))}
                  className="flex-1 accent-indigo-600"
                  disabled={gameState.status === "flipping"}
                />
                <span className="w-10 text-center font-bold text-indigo-600 text-lg">
                  {numFlips}
                </span>
              </div>
            </div>

            {/* Betting status */}
            {gameState.status === "betting" && (
              <div className="bg-yellow-50 rounded-xl p-3 text-sm text-yellow-800">
                <div className="font-semibold">베팅 현황</div>
                <div>{submittedCount} / {totalGroups}조 제출 완료</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(groups).map(([id, g]) => (
                    <span
                      key={id}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        g.submitted
                          ? "bg-green-200 text-green-800"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {g.name} {g.submitted ? "✓" : "…"}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              {(gameState.status === "idle" || gameState.status === "results") && (
                <button
                  onClick={handleNewRound}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition shadow"
                >
                  🎲 새 라운드 시작 (베팅 열기)
                </button>
              )}

              {gameState.status === "results" && (
                <button
                  onClick={handleStartQuiz}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition shadow"
                >
                  다음: 퀴즈 시작
                </button>
              )}

              {gameState.status === "betting" && (
                <button
                  onClick={handleCloseBetting}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition shadow"
                >
                  🔒 베팅 마감
                </button>
              )}

              {gameState.status === "flipping" && !isFlipping && (
                <button
                  onClick={handleFlipAll}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition shadow animate-pulse"
                >
                  🪙 동전 던지기 시작!
                </button>
              )}

              {isFlipping && (
                <div className="w-full bg-gray-100 text-gray-500 font-bold py-3 rounded-xl text-center text-sm">
                  ⏳ 동전 던지는 중... ({flipLog.length}/{numFlips})
                </div>
              )}

              <button
                onClick={handleReset}
                className="w-full bg-red-100 hover:bg-red-200 text-red-600 font-medium py-2 rounded-xl transition text-sm"
              >
                🗑️ 전체 초기화
              </button>
            </div>
          </div>

          {/* Coin visual */}
          {coinResult && (
            <div className="bg-white rounded-2xl shadow-md p-4 text-center">
              <motion.div
                key={flipLog.length}
                animate={{ rotateY: [0, 360] }}
                transition={{ duration: 0.4 }}
                className="text-5xl mb-2"
              >
                {coinResult === "heads" ? "☀️" : "🌙"}
              </motion.div>
              <div className={`font-bold ${coinResult === "heads" ? "text-yellow-600" : "text-blue-600"}`}>
                {coinResult === "heads" ? "앞면 +1" : "뒷면 -1"}
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div className="bg-white rounded-2xl shadow-md p-5">
            <h2 className="text-lg font-bold text-gray-700 mb-3">🏆 순위표</h2>
            <LeaderBoard
              groups={groups}
              result={gameState.status === "results" ? gameState.result : null}
            />
          </div>
        </div>
      </div>
      )}
    </main>
  );
}
