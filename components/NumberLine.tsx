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

  const shouldShowLabel = (val: number, isCenter: boolean, isCurrent: boolean) =>
    isCenter || isCurrent || Math.abs(val) === MAX || val % 5 === 0;

  return (
    <div className="w-full pb-1">
      <div className="relative w-full px-0.5" style={{ height: 120 }}>
        {/* Character */}
        <div
          className="absolute bottom-7 z-10 flex flex-col items-center pointer-events-none"
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
              animate={{ opacity: 0, y: -28 }}
              transition={{ duration: transitionDuration * 0.7 }}
              className={`mb-0.5 text-xl font-black drop-shadow-md ${showMove > 0 ? "text-green-500" : "text-red-500"}`}
            >
              {showMove > 0 ? "+1" : "-1"}
            </motion.div>
          )}
          <motion.div
            animate={isAnimating ? { y: [0, -12, 0, -8, 0] } : { y: 0 }}
            transition={{ duration: Math.max(0.3, transitionDuration * 0.7), repeat: isAnimating ? Infinity : 0 }}
            className="select-none text-5xl leading-none drop-shadow-lg"
          >
            {CHARACTER_FRAMES[charFrame]}
          </motion.div>
          <div className="mt-0.5 h-0 w-0 border-l-[8px] border-r-[8px] border-t-[11px] border-l-transparent border-r-transparent border-t-yellow-400" />
        </div>

        {/* Horizontal axis line */}
        <div className="absolute bottom-5 left-0 right-0 h-1.5 rounded-full bg-gray-700" />

        {/* Tick marks & labels */}
        {Array.from({ length: TOTAL }, (_, i) => {
          const val = MIN + i;
          const isCenter = val === 0;
          const isCurrent = val === position;
          const isBoundary = Math.abs(val) === MAX;
          const showLabel = shouldShowLabel(val, isCenter, isCurrent);
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
              {isCurrent && (
                <motion.div
                  layoutId="glow"
                  className="absolute bottom-3 h-8 w-8 rounded-full bg-yellow-300 opacity-50 blur-sm"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}

              <div
                className={`mb-0.5 rounded-full
                  ${isCenter
                    ? "h-9 w-1.5 bg-indigo-600"
                    : isCurrent
                    ? "h-7 w-1.5 bg-yellow-500"
                    : isBoundary
                    ? "h-7 w-1.5 bg-red-400"
                    : val % 5 === 0
                    ? "h-5 w-1 bg-gray-500"
                    : "h-3 w-px bg-gray-400"}
                `}
              />

              {showLabel ? (
                <span
                  className={`select-none font-mono leading-none
                    ${isCenter
                      ? "text-sm font-black text-indigo-700"
                      : isCurrent
                      ? "text-xs font-black text-yellow-600"
                      : isBoundary
                      ? "text-[10px] font-bold text-red-500"
                      : "text-[10px] font-semibold text-gray-500"}
                  `}
                >
                  {val}
                </span>
              ) : (
                <span className="h-3" aria-hidden />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-1 flex min-w-full justify-between px-1 text-[11px]">
        <span className="font-bold text-red-500">← {MIN}</span>
        <span className="font-black text-indigo-700">0</span>
        <span className="font-bold text-green-600">{MAX} →</span>
      </div>
    </div>
  );

}
