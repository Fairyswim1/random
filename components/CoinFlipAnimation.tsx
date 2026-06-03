"use client";

import { motion, AnimatePresence } from "framer-motion";

interface CoinFlipAnimationProps {
  isFlipping: boolean;
  result: "heads" | "tails" | null;
  flipCount: number;
}

export default function CoinFlipAnimation({ isFlipping, result, flipCount }: CoinFlipAnimationProps) {
  const isHeads = result === "heads";

  return (
    <div className="flex flex-col items-center gap-3">
      {/* 3D Coin */}
      <div style={{ perspective: 600 }}>
        <motion.div
          key={flipCount}
          animate={
            isFlipping
              ? { rotateY: [0, 180, 360, 540, 720, 900, 1080], scale: [1, 1.15, 1.15, 1.15, 1.15, 1.15, 1] }
              : { rotateY: 0, scale: 1 }
          }
          transition={{ duration: 0.35, ease: "easeInOut" }}
          style={{ transformStyle: "preserve-3d", display: "inline-block" }}
          className="w-28 h-28 relative"
        >
          {/* 앞면 */}
          <div
            className="absolute inset-0 rounded-full flex items-center justify-center text-5xl shadow-xl"
            style={{
              backfaceVisibility: "hidden",
              background: "radial-gradient(circle at 35% 35%, #ffe566, #f5a623)",
              border: "4px solid #e09000",
            }}
          >
            ☀️
          </div>
          {/* 뒷면 */}
          <div
            className="absolute inset-0 rounded-full flex items-center justify-center text-5xl shadow-xl"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              background: "radial-gradient(circle at 35% 35%, #c8d8f0, #7a9fc8)",
              border: "4px solid #5070a0",
            }}
          >
            🌙
          </div>
        </motion.div>
      </div>

      {/* Result label */}
      <AnimatePresence mode="wait">
        {result && !isFlipping && (
          <motion.div
            key={`${result}-${flipCount}`}
            initial={{ opacity: 0, y: 8, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`px-5 py-1.5 rounded-full font-bold text-lg shadow ${
              isHeads
                ? "bg-yellow-100 text-yellow-700 border-2 border-yellow-300"
                : "bg-blue-100 text-blue-700 border-2 border-blue-300"
            }`}
          >
            {isHeads ? "앞면 ☀️  +1" : "뒷면 🌙  -1"}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
