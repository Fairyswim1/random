import { getDb } from "./firebase";
import {
  ref,
  set,
  get,
  onValue,
  update,
  remove,
} from "firebase/database";

export type GameStatus = "idle" | "betting" | "flipping" | "results";

export interface GameState {
  status: GameStatus;
  numFlips: number;
  currentPosition: number;
  result: number | null;
  round: number;
  flipHistory: number[];
  bettingOpen: boolean;
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

export interface GameData {
  gameState: GameState;
  groups: { [groupId: string]: Group };
}

const GAME_STATE_REF = "gameState";
const GROUPS_REF = "groups";

export const defaultGameState: GameState = {
  status: "idle",
  numFlips: 5,
  currentPosition: 0,
  result: null,
  round: 0,
  flipHistory: [],
  bettingOpen: false,
};

export async function initGame() {
  await set(ref(getDb(), GAME_STATE_REF), defaultGameState);
}

export async function getGameState(): Promise<GameState> {
  const snap = await get(ref(getDb(), GAME_STATE_REF));
  return snap.val() ?? defaultGameState;
}

export function subscribeGameState(cb: (state: GameState) => void) {
  return onValue(ref(getDb(), GAME_STATE_REF), (snap) => {
    cb(snap.val() ?? defaultGameState);
  });
}

export async function updateGameState(partial: Partial<GameState>) {
  await update(ref(getDb(), GAME_STATE_REF), partial);
}

export async function setGameState(state: GameState) {
  await set(ref(getDb(), GAME_STATE_REF), state);
}

export function subscribeGroups(cb: (groups: { [id: string]: Group }) => void) {
  return onValue(ref(getDb(), GROUPS_REF), (snap) => {
    cb(snap.val() ?? {});
  });
}

export async function getGroups(): Promise<{ [id: string]: Group }> {
  const snap = await get(ref(getDb(), GROUPS_REF));
  return snap.val() ?? {};
}

export async function registerGroup(groupId: string, name: string) {
  const existing = await get(ref(getDb(), `${GROUPS_REF}/${groupId}`));
  if (!existing.val()) {
    await set(ref(getDb(), `${GROUPS_REF}/${groupId}`), {
      name,
      coins: 10,
      bets: {},
      submitted: false,
      totalWon: 0,
    });
  }
}

export async function submitBet(groupId: string, bets: GroupBet) {
  const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);
  const snap = await get(ref(getDb(), `${GROUPS_REF}/${groupId}`));
  const group: Group = snap.val();
  if (totalBet > group.coins) throw new Error("코인이 부족합니다");

  await update(ref(getDb(), `${GROUPS_REF}/${groupId}`), {
    bets,
    submitted: true,
    coins: group.coins - totalBet,
  });
}

export async function processResults(result: number) {
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

  await update(ref(getDb()), updates);
}

export async function resetBets() {
  const groups = await getGroups();
  const updates: Record<string, unknown> = {};
  for (const groupId of Object.keys(groups)) {
    updates[`${GROUPS_REF}/${groupId}/submitted`] = false;
    updates[`${GROUPS_REF}/${groupId}/bets`] = {};
  }
  await update(ref(getDb()), updates);
}

export async function resetAllGroups() {
  await remove(ref(getDb(), GROUPS_REF));
}
