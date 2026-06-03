"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface NumberLineProps {
  position: number;
  isAnimating: boolean;
  lastMove: number | null;
}

const CHARACTER_FRAMES = ["🐣", "🐤", "🐥"];

export default function NumberLine({ position, isAnimating, lastMove }: NumberLineProps) {
  const [charFrame, setCharFrame] = useState(0);
  const [showMove, setShowMove] = useState<number | null>(null);

  useEffect(() => {
    if (isAnimating) {
      let i = 0;
      const interval = setInterval(() => {
        setCharFrame((f) => (f + 1) % 3);
        i++;
        if (i > 6) clearInterval(interval);
      }, 150);
      return () => clearInterval(interval);
    }
  }, [isAnimating]);

  useEffect(() => {
    if (lastMove !== null) {
      setShowMove(lastMove);
      const t = setTimeout(() => setShowMove(null), 700);
      return () => clearTimeout(t);
    }
  }, [lastMove, position]);

  const MIN = -10;
  const MAX = 10;
  const TOTAL = MAX - MIN + 1; // 21 cells

  return (
    <div className="w-full overflow-x-auto py-4">
      <div className="relative min-w-[680px] mx-auto" style={{ width: "100%" }}>
        {/* Number line track */}
        <div className="relative flex items-end" style={{ height: 110 }}>
          {/* Character */}
          <motion.div
            key={`char-${position}`}
            layout
            animate={{ x: 0 }}
            initial={false}
            className="absolute bottom-10 z-10 flex flex-col items-center pointer-events-none"
            style={{
              left: `calc(${((position - MIN) / (TOTAL - 1)) * 100}% - 22px)`,
              transition: "left 0.5s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            {showMove !== null && (
              <motion.div
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.6 }}
                className={`text-lg font-bold mb-1 ${showMove > 0 ? "text-green-500" : "text-red-500"}`}
              >
                {showMove > 0 ? "+1" : "-1"}
              </motion.div>
            )}
            <motion.div
              animate={isAnimating ? { y: [0, -10, 0, -8, 0] } : { y: 0 }}
              transition={{ duration: 0.5, repeat: isAnimating ? Infinity : 0 }}
              className="text-4xl select-none"
            >
              {CHARACTER_FRAMES[charFrame]}
            </motion.div>
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-yellow-400 mt-0" />
          </motion.div>

          {/* Cells */}
          <div className="flex w-full items-end">
            {Array.from({ length: TOTAL }, (_, i) => {
              const val = MIN + i;
              const isCenter = val === 0;
              const isCurrent = val === position;

              return (
                <div
                  key={val}
                  className="flex-1 flex flex-col items-center"
                >
                  <div
                    className={`w-full h-3 border-t-2 border-gray-400 relative
                      ${isCenter ? "border-t-4 border-indigo-600" : ""}
                      ${isCurrent ? "bg-yellow-200 rounded-t" : ""}
                    `}
                  >
                    {/* Tick mark */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-gray-400" />
                  </div>
                  <span className={`text-xs mt-1 font-mono select-none
                    ${isCenter ? "text-indigo-700 font-bold text-sm" : "text-gray-500"}
                    ${isCurrent ? "text-yellow-600 font-bold" : ""}
                  `}>
                    {val}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Boundary indicators */}
        <div className="flex justify-between mt-1 px-1">
          <span className="text-xs text-red-400 font-semibold">← 왼쪽 경계</span>
          <span className="text-xs font-bold text-indigo-600">출발점: 0</span>
          <span className="text-xs text-green-500 font-semibold">오른쪽 경계 →</span>
        </div>
      </div>
    </div>
  );
}
