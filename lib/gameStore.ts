import { getDb } from "./firebase";

export type GameStatus = "idle" | "betting" | "flipping" | "results" | "quiz";
export type QuizQuestionType = "ox" | "short";

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  answer?: string;
}

export interface GameState {
  status: GameStatus;
  numFlips: number;
  currentPosition: number;
  result: number | null;
  round: number;
  flipHistory: number[];
  bettingOpen: boolean;
  quizIndex: number;
  quizOpen: boolean;
}

export interface GroupBet {
  [position: string]: number;
}

export interface Group {
  name: string;
  coins: number;
  bets: GroupBet;
  submitted: boolean;
  totalWon: number;
}

export interface QuizAnswer {
  answer: string;
  submittedAt: number;
}

export interface QuizAnswers {
  [groupId: string]: {
    [questionId: string]: QuizAnswer;
  };
}

const GAME_STATE_REF = "gameState";
const GROUPS_REF = "groups";
const QUIZ_ANSWERS_REF = "quizAnswers";

export const quizQuestions: QuizQuestion[] = [
  {
    id: "ox-1",
    type: "ox",
    prompt: "동전을 여러 번 던지는 랜덤워크에서 매번 앞면과 뒷면이 나올 확률은 같다.",
    answer: "O",
  },
  {
    id: "ox-2",
    type: "ox",
    prompt: "동전을 5번 던지면 최종 위치가 항상 +5 또는 -5 중 하나로만 끝난다.",
    answer: "X",
  },
  {
    id: "ox-3",
    type: "ox",
    prompt: "동전 던지기 횟수가 많아져도 매번 다음 이동 방향은 이전 결과와 상관없이 정해진다.",
    answer: "O",
  },
  {
    id: "short-1",
    type: "short",
    prompt: "오늘 게임에서 랜덤워크가 무엇을 의미하는지 모둠의 말로 간단히 설명해 보세요.",
  },
];

export const defaultGameState: GameState = {
  status: "idle",
  numFlips: 5,
  currentPosition: 0,
  result: null,
  round: 0,
  flipHistory: [],
  bettingOpen: false,
  quizIndex: 0,
  quizOpen: false,
};

export function subscribeGameState(cb: (state: GameState) => void): () => void {
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;

  (async () => {
    const { ref, onValue } = await import("firebase/database");
    if (cancelled) return;
    const db = await getDb();
    if (cancelled) return;
    unsubscribe = onValue(ref(db, GAME_STATE_REF), (snap) => {
      cb(snap.val() ?? defaultGameState);
    });
  })();

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

export function subscribeGroups(cb: (groups: { [id: string]: Group }) => void): () => void {
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;

  (async () => {
    const { ref, onValue } = await import("firebase/database");
    if (cancelled) return;
    const db = await getDb();
    if (cancelled) return;
    unsubscribe = onValue(ref(db, GROUPS_REF), (snap) => {
      cb(snap.val() ?? {});
    });
  })();

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

export function subscribeQuizAnswers(cb: (answers: QuizAnswers) => void): () => void {
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;

  (async () => {
    const { ref, onValue } = await import("firebase/database");
    if (cancelled) return;
    const db = await getDb();
    if (cancelled) return;
    unsubscribe = onValue(ref(db, QUIZ_ANSWERS_REF), (snap) => {
      cb(snap.val() ?? {});
    });
  })();

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

export async function updateGameState(partial: Partial<GameState>) {
  const { ref, update } = await import("firebase/database");
  const db = await getDb();
  await update(ref(db, GAME_STATE_REF), partial);
}

export async function setGameState(state: GameState) {
  const { ref, set } = await import("firebase/database");
  const db = await getDb();
  await set(ref(db, GAME_STATE_REF), state);
}

export async function getGroups(): Promise<{ [id: string]: Group }> {
  const { ref, get } = await import("firebase/database");
  const db = await getDb();
  const snap = await get(ref(db, GROUPS_REF));
  return snap.val() ?? {};
}

export async function registerGroup(groupId: string, name: string) {
  const { ref, get, set } = await import("firebase/database");
  const db = await getDb();
  const existing = await get(ref(db, `${GROUPS_REF}/${groupId}`));
  if (!existing.val()) {
    await set(ref(db, `${GROUPS_REF}/${groupId}`), {
      name,
      coins: 10,
      bets: {},
      submitted: false,
      totalWon: 0,
    });
  }
}

export async function submitBet(groupId: string, bets: GroupBet) {
  const { ref, get, update } = await import("firebase/database");
  const db = await getDb();
  const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);
  const snap = await get(ref(db, `${GROUPS_REF}/${groupId}`));
  const group: Group = snap.val();
  if (totalBet > group.coins) throw new Error("코인이 부족합니다");
  await update(ref(db, `${GROUPS_REF}/${groupId}`), {
    bets,
    submitted: true,
    coins: group.coins - totalBet,
  });
}

export async function submitQuizAnswer(groupId: string, questionId: string, answer: string) {
  const { ref, set } = await import("firebase/database");
  const db = await getDb();
  await set(ref(db, `${QUIZ_ANSWERS_REF}/${groupId}/${questionId}`), {
    answer,
    submittedAt: Date.now(),
  });
}

export async function processResults(result: number) {
  const { ref, update } = await import("firebase/database");
  const db = await getDb();
  const groups = await getGroups();
  const updates: Record<string, unknown> = {};

  for (const [groupId, group] of Object.entries(groups)) {
    const betOnResult = group.bets?.[result.toString()] ?? 0;
    const reward = betOnResult * 2;
    updates[`${GROUPS_REF}/${groupId}/coins`] = group.coins + reward;
    updates[`${GROUPS_REF}/${groupId}/totalWon`] = (group.totalWon ?? 0) + reward;
    updates[`${GROUPS_REF}/${groupId}/submitted`] = false;
    updates[`${GROUPS_REF}/${groupId}/bets`] = {};
  }

  await update(ref(db), updates);
}

export async function resetBets() {
  const { ref, update } = await import("firebase/database");
  const db = await getDb();
  const groups = await getGroups();
  const updates: Record<string, unknown> = {};
  for (const groupId of Object.keys(groups)) {
    updates[`${GROUPS_REF}/${groupId}/submitted`] = false;
    updates[`${GROUPS_REF}/${groupId}/bets`] = {};
  }
  await update(ref(db), updates);
}

export async function resetQuizAnswers() {
  const { ref, remove } = await import("firebase/database");
  const db = await getDb();
  await remove(ref(db, QUIZ_ANSWERS_REF));
}

export async function resetAllGroups() {
  const { ref, remove } = await import("firebase/database");
  const db = await getDb();
  await remove(ref(db, GROUPS_REF));
  await remove(ref(db, QUIZ_ANSWERS_REF));
}
