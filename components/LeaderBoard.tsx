"use client";

import { motion } from "framer-motion";
import { Group } from "@/lib/gameStore";

interface LeaderBoardProps {
  groups: { [id: string]: Group };
  result?: number | null;
}

const MEDAL = ["🥇", "🥈", "🥉"];

export default function LeaderBoard({ groups, result }: LeaderBoardProps) {
  const sorted = Object.entries(groups).sort(
    ([, a], [, b]) => b.coins - a.coins
  );

  if (sorted.length === 0) {
    return (
      <div className="text-center text-gray-400 py-6 text-sm">
        아직 참여한 조가 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map(([id, group], idx) => {
        const betOnResult =
          result != null ? (group.bets?.[result.toString()] ?? 0) : 0;
        const isWinner = result != null && betOnResult > 0;

        return (
          <motion.div
            key={id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`flex items-center justify-between rounded-xl px-4 py-3 shadow-sm
              ${isWinner ? "bg-yellow-50 border-2 border-yellow-300" : "bg-white border border-gray-100"}
            `}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{MEDAL[idx] ?? `${idx + 1}.`}</span>
              <div>
                <div className="font-semibold text-gray-800">{group.name}</div>
                {result != null && group.bets && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {Object.entries(group.bets).length > 0
                      ? `베팅: ${Object.entries(group.bets)
                          .filter(([, v]) => v > 0)
                          .map(([pos, amt]) => `${pos}번(${amt}코인)`)
                          .join(", ")}`
                      : "베팅 없음"}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isWinner && (
                <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full font-bold">
                  +{betOnResult * 2} 획득!
                </span>
              )}
              <div className="flex items-center gap-1">
                <span className="text-yellow-500">🪙</span>
                <span className="font-bold text-lg text-gray-800">{group.coins}</span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
