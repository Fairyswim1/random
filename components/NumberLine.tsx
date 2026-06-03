"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface NumberLineProps {
  position: number;
  isAnimating: boolean;
  lastMove: number | null;
  transitionDuration?: number;
}

const CHARACTER_FRAMES = ["🐣", "🐤", "🐥"];

export default function NumberLine({
  position,
  isAnimating,
  lastMove,
  transitionDuration = 0.5,
}: NumberLineProps) {
  const [charFrame, setCharFrame] = useState(0);
  const [showMove, setShowMove] = useState<number | null>(null);

  useEffect(() => {
    if (isAnimating) {
      const interval = setInterval(() => {
        setCharFrame((f) => (f + 1) % 3);
      }, 120);
      return () => clearInterval(interval);
    }
  }, [isAnimating]);

  useEffect(() => {
    if (lastMove !== null) {
      setShowMove(lastMove);
      const t = setTimeout(() => setShowMove(null), transitionDuration * 1000 * 0.8);
      return () => clearTimeout(t);
    }
  }, [lastMove, position, transitionDuration]);

  const MIN = -10;
  const MAX = 10;
  const TOTAL = MAX - MIN + 1;

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="relative" style={{ minWidth: 800 }}>

        {/* Character layer */}
        <div className="relative" style={{ height: 130 }}>
          <motion.div
            className="absolute bottom-0 z-10 flex flex-col items-center pointer-events-none"
            style={{
              left: `calc(${((position - MIN) / (TOTAL - 1)) * 100}% - 28px)`,
              transition: `left ${transitionDuration}s cubic-bezier(0.34,1.56,0.64,1)`,
            }}
          >
            {/* +1 / -1 floating label */}
            {showMove !== null && (
              <motion.div
                key={`${position}-${showMove}`}
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -30 }}
                transition={{ duration: transitionDuration * 0.8 }}
                className={`text-2xl font-black mb-1 drop-shadow ${showMove > 0 ? "text-green-500" : "text-red-500"}`}
              >
                {showMove > 0 ? "+1" : "-1"}
              </motion.div>
            )}

            {/* Character */}
            <motion.div
              animate={isAnimating ? { y: [0, -14, 0, -10, 0] } : { y: 0 }}
              transition={{ duration: transitionDuration * 0.8, repeat: isAnimating ? Infinity : 0 }}
              className="text-6xl select-none leading-none"
            >
              {CHARACTER_FRAMES[charFrame]}
            </motion.div>

            {/* Arrow indicator */}
            <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[12px] border-l-transparent border-r-transparent border-t-yellow-400" />
          </motion.div>
        </div>

        {/* Number line track */}
        <div className="relative flex items-start" style={{ height: 80 }}>
          {/* Main horizontal line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-700 rounded-full" />

          {Array.from({ length: TOTAL }, (_, i) => {
            const val = MIN + i;
            const isCenter = val === 0;
            const isCurrent = val === position;
            const pct = (i / (TOTAL - 1)) * 100;

            return (
              <div
                key={val}
                className="absolute flex flex-col items-center"
                style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
              >
                {/* Tick */}
                <div
                  className={`rounded-full
                    ${isCenter ? "w-2 h-10 bg-indigo-600" : isCurrent ? "w-1.5 h-8 bg-yellow-500" : "w-1 h-6 bg-gray-500"}
                  `}
                />

                {/* Highlight circle for current position */}
                {isCurrent && (
                  <motion.div
                    layoutId="current-pos"
                    className="absolute -top-3 w-7 h-7 rounded-full bg-yellow-300 opacity-60"
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  />
                )}

                {/* Number label */}
                <span
                  className={`mt-2 font-mono font-bold select-none
                    ${isCenter ? "text-xl text-indigo-700" : isCurrent ? "text-lg text-yellow-600" : "text-sm text-gray-500"}
                  `}
                >
                  {val}
                </span>
              </div>
            );
          })}
        </div>

        {/* Boundary labels */}
        <div className="flex justify-between mt-4 px-1">
          <span className="text-sm text-red-500 font-bold">← -10 (왼쪽 끝)</span>
          <span className="text-base font-black text-indigo-700">출발점: 0</span>
          <span className="text-sm text-green-600 font-bold">+10 (오른쪽 끝) →</span>
        </div>
      </div>
    </div>
  );
}
