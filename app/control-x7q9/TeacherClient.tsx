"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import NumberLine from "@/components/NumberLine";
import LeaderBoard from "@/components/LeaderBoard";
import CoinFlipAnimation from "@/components/CoinFlipAnimation";
import {
  subscribeGameState,
  subscribeGroups,
  updateGameState,
  setGameState,
  processResults,
  resetBets,
  resetQuizAnswers,
  resetAllGroups,
  resetCoinsOnly,
  giveCoinsToAll,
  subscribeQuizAnswers,
  GameState,
  Group,
  QuizAnswers,
  defaultGameState,
  quizQuestions,
  PADLET_ACTIVITY_URL,
} from "@/lib/gameStore";
import { useRouter } from "next/navigation";

type CoinResult = "heads" | "tails";

export default function TeacherPage() {
  const router = useRouter();
  const [gameState, setGameStateLocal] = useState<GameState>(defaultGameState);
  const [groups, setGroups] = useState<{ [id: string]: Group }>({});
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswers>({});
  const [numFlips, setNumFlips] = useState(5);
  // 전체 소요시간 무조건 2초 고정 (Firebase 호출 없이 로컬 애니메이션만)
  const flipInterval = Math.max(20, Math.round(2000 / numFlips));
  const transitionDuration = Math.max(0.018, flipInterval / 1000 * 0.6);
  const [isFlipping, setIsFlipping] = useState(false);
  const [coinResult, setCoinResult] = useState<CoinResult | null>(null);
  const [flipLog, setFlipLog] = useState<CoinResult[]>([]);
  const [lastMove, setLastMove] = useState<number | null>(null);
  const flippingRef = useRef(false);
  const hasNormalizedState = useRef(false);

  useEffect(() => {
    const unsub1 = subscribeGameState((state) => {
      setGameStateLocal(state);
      if (!hasNormalizedState.current) {
        hasNormalizedState.current = true;
        if (state.status === "quiz" || state.status === "padlet") {
          void setGameState(defaultGameState);
          setGameStateLocal(defaultGameState);
        }
      }
    });
    const unsub2 = subscribeGroups(setGroups);
    const unsub3 = subscribeQuizAnswers(setQuizAnswers);
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  const handleNewRound = async () => {
    const currentRound = gameState.round || 0;
    await setGameState({
      ...defaultGameState,
      status: "betting",
      numFlips,
      round: currentRound + 1,
      bettingOpen: true,
    });
    await resetBets();
    if (currentRound >= 1) {
      await giveCoinsToAll(10); // 2라운드부터 기본 10코인 추가 지급
    }
    setFlipLog([]);
    setCoinResult(null);
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

      // 로컬 상태만 즉시 업데이트 (Firebase 기다리지 않음 → 빠른 애니메이션)
      setCoinResult(result);
      setLastMove(move);
      setFlipLog([...log]);

      // Firebase는 5번마다 또는 마지막에만 업데이트
      if ((i + 1) % 5 === 0 || i === numFlips - 1) {
        updateGameState({
          currentPosition: pos,
          flipHistory: log.map((r) => (r === "heads" ? 1 : -1)),
        }); // await 없이 fire-and-forget
      }

      await sleep(flipInterval);
    }

    // Done - Firebase 최종 결과 업데이트
    await processResults(pos);
    await updateGameState({
      result: pos,
      status: "results",
      currentPosition: pos,
    });

    setIsFlipping(false);
    flippingRef.current = false;
  }, [numFlips, flipInterval]);

  const handleResetCoins = async () => {
    if (!confirm("모든 조의 코인을 10개로 리셋하시겠습니까? (조는 유지됩니다)")) return;
    await resetCoinsOnly();
    await setGameState({ ...defaultGameState, round: 0 });
    setFlipLog([]);
    setCoinResult(null);
  };

  const handleReset = async () => {
    if (!confirm("모든 조를 완전히 삭제하시겠습니까? (학생들이 재입장해야 합니다)")) return;
    await resetAllGroups();
    await setGameState(defaultGameState);
    setFlipLog([]);
    setCoinResult(null);
  };

  const handleStartQuiz = async () => {
    await resetQuizAnswers();
    await updateGameState({ status: "quiz", quizIndex: 0, quizOpen: true, quizRevealed: false });
  };

  const handlePrevQuiz = async () => {
    await updateGameState({
      quizIndex: Math.max(0, (gameState.quizIndex ?? 0) - 1),
      quizOpen: true,
      quizRevealed: false,
    });
  };

  const handleNextQuiz = async () => {
    const nextIndex = Math.min(quizQuestions.length - 1, (gameState.quizIndex ?? 0) + 1);
    await updateGameState({ quizIndex: nextIndex, quizOpen: true, quizRevealed: false });
  };

  const handleRevealAnswers = async () => {
    await updateGameState({ quizRevealed: true });
  };

  const handleGoToPadlet = async () => {
    await updateGameState({ status: "padlet", quizOpen: false });
    window.location.href = PADLET_ACTIVITY_URL;
  };

  const handleLogout = async () => {
    await fetch("/api/teacher-auth", { method: "DELETE", credentials: "same-origin" });
    window.location.href = "/control-x7q9/login";
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
  const hideAnswersUntilReveal = currentQuizIndex >= 1;
  const quizRevealed = gameState.quizRevealed ?? false;
  const answersVisible = !hideAnswersUntilReveal || quizRevealed;
  const allQuizSubmitted = totalGroups > 0 && quizSubmittedCount >= totalGroups;

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
          <button
            onClick={handleLogout}
            className="rounded-lg px-2 py-1 text-indigo-200 transition hover:bg-indigo-600 hover:text-white"
          >
            로그아웃
          </button>
          <span className={`px-3 py-1 rounded-full font-semibold ${
            gameState.status === "idle" ? "bg-gray-400" :
            gameState.status === "betting" ? "bg-yellow-400 text-yellow-900" :
            gameState.status === "flipping" ? "bg-orange-400" :
            gameState.status === "quiz" ? "bg-purple-400 text-purple-950" :
            gameState.status === "padlet" ? "bg-teal-400 text-teal-950" :
            "bg-green-400 text-green-900"
          }`}>
            {gameState.status === "idle" ? "대기 중" :
             gameState.status === "betting" ? "베팅 진행 중" :
             gameState.status === "flipping" ? "동전 던지는 중" :
             gameState.status === "quiz" ? "퀴즈 진행 중" :
             gameState.status === "padlet" ? "패들렛 활동" :
             "결과 발표"}
          </span>
        </div>
      </div>

      {gameState.status === "results" && gameState.result !== null && (
        <div className="sticky top-0 z-20 border-b border-purple-300 bg-purple-600 px-4 py-4 shadow-lg">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="text-center text-white sm:text-left">
              <div className="text-sm font-semibold text-purple-100">게임 결과 확인</div>
              <div className="text-lg font-bold">최종 위치 {gameState.result}번 · 퀴즈로 이동하세요</div>
            </div>
            <button
              onClick={handleStartQuiz}
              className="w-full shrink-0 rounded-xl bg-white px-8 py-4 text-lg font-bold text-purple-700 shadow-md transition hover:bg-purple-50 sm:w-auto"
            >
              다음 → 퀴즈 시작
            </button>
          </div>
        </div>
      )}

      {gameState.status === "quiz" && gameState.quizOpen ? (
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="text-sm font-semibold text-purple-600 mb-2">
              퀴즈 {currentQuizIndex + 1} / {quizQuestions.length}
            </div>
            <h2 className="text-2xl font-bold text-gray-800">{currentQuiz.prompt}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-700">
                {currentQuiz.type === "ox" ? "OX 퀴즈" : "주관식"}
              </span>
              {currentQuiz.answer && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                  정답: {currentQuiz.answer}
                </span>
              )}
              <span className="rounded-full bg-purple-50 px-3 py-1 text-sm font-semibold text-purple-700">
                제출 {quizSubmittedCount}/{totalGroups}
              </span>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button onClick={handlePrevQuiz} disabled={currentQuizIndex === 0} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 disabled:opacity-40">이전 문제</button>
              {hideAnswersUntilReveal && !quizRevealed && (
                <button
                  onClick={handleRevealAnswers}
                  disabled={!allQuizSubmitted}
                  className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-green-700 disabled:opacity-40"
                >
                  정답 공개 {allQuizSubmitted ? "" : `(${quizSubmittedCount}/${totalGroups})`}
                </button>
              )}
              <button onClick={handleNextQuiz} disabled={currentQuizIndex === quizQuestions.length - 1} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">다음 문제</button>
              <button
                onClick={handleGoToPadlet}
                className="rounded-xl bg-teal-600 px-6 py-3 text-base font-bold text-white shadow-md transition hover:bg-teal-700"
              >
                다음 → 패들렛
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-700 mb-4">모둠별 답안</h3>
            <div className="grid gap-3">
              {currentQuizAnswers.length === 0 ? (
                <div className="rounded-xl bg-gray-50 p-6 text-center text-gray-500">아직 입장한 모둠이 없습니다.</div>
              ) : (
                currentQuizAnswers.map(({ groupId, group, answer }) => {
                  const isCorrect = currentQuiz.answer ? answer?.answer === currentQuiz.answer : null;
                  return (
                    <div key={groupId} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="font-bold text-gray-800">{group.name}</div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${answer ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>
                          {answer ? "제출 완료" : "미제출"}
                        </span>
                      </div>
                      <div className="text-gray-700">
                        {answersVisible
                          ? (answer?.answer ?? "아직 답안이 없습니다.")
                          : answer
                            ? "제출 완료 (답안 숨김)"
                            : "아직 답안이 없습니다."}
                      </div>
                      {isCorrect !== null && answer && answersVisible && (
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

        {/* 게임 결과 확인 카드 */}
        {gameState.status === "results" && gameState.result !== null && (
          <div className="rounded-2xl border-2 border-orange-300 bg-gradient-to-r from-yellow-400 to-orange-400 px-8 py-6 text-white shadow-lg">
            <h2 className="mb-3 text-center text-xl font-bold">📋 게임 결과 확인</h2>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
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
              <button
                onClick={handleStartQuiz}
                className="w-full shrink-0 rounded-xl bg-white px-8 py-4 text-lg font-bold text-orange-600 shadow-md transition hover:bg-orange-50 sm:w-auto"
              >
                다음 → 퀴즈 시작
              </button>
            </div>
          </div>
        )}

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
              {gameState.status === "results" && (
                <button
                  onClick={handleStartQuiz}
                  className="w-full rounded-xl bg-purple-600 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-purple-700"
                >
                  다음 → 퀴즈 시작
                </button>
              )}
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
              <button onClick={handleResetCoins} className="w-full bg-yellow-100 hover:bg-yellow-200 text-yellow-700 font-medium py-2 rounded-xl transition text-sm">
                🔄 코인 리셋 (조 유지)
              </button>
              <button onClick={handleReset} className="w-full bg-red-100 hover:bg-red-200 text-red-600 font-medium py-2 rounded-xl transition text-sm">
                🗑️ 전체 초기화 (조 삭제)
              </button>
            </div>
          </div>

          {/* 동전 애니메이션 + 기록 */}
          <div className="bg-white rounded-2xl shadow-md p-5">
            <h3 className="font-bold text-gray-700 mb-3">🪙 동전 던지기</h3>
            <div className="flex flex-col items-center mb-4">
              <CoinFlipAnimation
                isFlipping={isFlipping}
                result={coinResult}
                flipCount={flipLog.length}
              />
            </div>
            {flipLog.length === 0 ? (
              <div className="text-gray-300 text-sm text-center py-2">동전을 던지면 여기에 기록됩니다</div>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {flipLog.map((r, i) => (
                    <motion.span
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow
                        ${r === "heads" ? "bg-yellow-100 text-yellow-600" : "bg-blue-100 text-blue-600"}`}
                    >
                      {r === "heads" ? "☀️" : "🌙"}
                    </motion.span>
                  ))}
                </div>
                <div className="mt-2 text-sm text-gray-500 flex gap-4">
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
      )}
    </main>
  );
}
