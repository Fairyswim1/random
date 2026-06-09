"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { POSITION_MIN, POSITION_MAX } from "@/lib/gameStore";

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

  const MIN = POSITION_MIN;
  const MAX = POSITION_MAX;
  const TOTAL = MAX - MIN + 1;

  return (
    <div className="w-full px-2">
      {/* Character + line container */}
      <div className="relative w-full" style={{ height: 160 }}>

        {/* Character */}
        <div
          className="absolute bottom-8 z-10 flex flex-col items-center pointer-events-none"
          style={{
            left: `calc(${((position - MIN) / (TOTAL - 1)) * 100}%)`,
            transform: "translateX(-50%)",
            transition: `left ${transitionDuration}s cubic-bezier(0.34,1.56,0.64,1)`,
          }}
        >
          {showMove !== null && (
            <motion.div
              key={`${position}-${lastMove}-${showMove}`}
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: -36 }}
              transition={{ duration: transitionDuration * 0.7 }}
              className={`text-3xl font-black drop-shadow-md mb-1 ${showMove > 0 ? "text-green-500" : "text-red-500"}`}
            >
              {showMove > 0 ? "+1" : "-1"}
            </motion.div>
          )}
          <motion.div
            animate={isAnimating ? { y: [0, -16, 0, -10, 0] } : { y: 0 }}
            transition={{ duration: Math.max(0.3, transitionDuration * 0.7), repeat: isAnimating ? Infinity : 0 }}
            className="text-7xl select-none leading-none drop-shadow-lg"
          >
            {CHARACTER_FRAMES[charFrame]}
          </motion.div>
          <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-yellow-400 mt-1" />
        </div>

        {/* Horizontal axis line */}
        <div className="absolute bottom-6 left-0 right-0 h-2 bg-gray-700 rounded-full" />

        {/* Tick marks & labels */}
        {Array.from({ length: TOTAL }, (_, i) => {
          const val = MIN + i;
          const isCenter = val === 0;
          const isCurrent = val === position;
          const pct = (i / (TOTAL - 1)) * 100;

          return (
            <div
              key={val}
              className="absolute flex flex-col items-center"
              style={{
                left: `${pct}%`,
                transform: "translateX(-50%)",
                bottom: 0,
              }}
            >
              {/* Glow under current */}
              {isCurrent && (
                <motion.div
                  layoutId="glow"
                  className="absolute bottom-4 w-10 h-10 rounded-full bg-yellow-300 opacity-50 blur-sm"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}

              {/* Tick */}
              <div
                className={`rounded-full mb-0.5
                  ${isCenter
                    ? "w-2.5 h-12 bg-indigo-600"
                    : isCurrent
                    ? "w-2 h-10 bg-yellow-500"
                    : Math.abs(val) === MAX
                    ? "w-2 h-10 bg-red-400"
                    : "w-1.5 h-7 bg-gray-500"}
                `}
              />

              {/* Number */}
              <span
                className={`font-mono font-black select-none
                  ${isCenter
                    ? "text-xl text-indigo-700"
                    : isCurrent
                    ? "text-lg text-yellow-600"
                    : Math.abs(val) === MAX
                    ? "text-base text-red-500"
                    : Math.abs(val) % 5 === 0
                    ? "text-base text-gray-600"
                    : "text-sm text-gray-400"}
                `}
              >
                {val}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom labels */}
      <div className="flex justify-between mt-1 px-1">
        <span className="text-sm font-bold text-red-500">← 왼쪽 끝 ({MIN})</span>
        <span className="text-base font-black text-indigo-700">출발점: 0</span>
        <span className="text-sm font-bold text-green-600">오른쪽 끝 ({MAX}) →</span>
      </div>
    </div>
  );
}
