"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface CoinFlipDisplayProps {
  isFlipping: boolean;
  result: "heads" | "tails" | null;
  onFlipComplete?: () => void;
}

export default function CoinFlipDisplay({ isFlipping, result, onFlipComplete }: CoinFlipDisplayProps) {
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (isFlipping) {
      setFlipping(true);
      const t = setTimeout(() => {
        setFlipping(false);
        onFlipComplete?.();
      }, 600);
      return () => clearTimeout(t);
    }
  }, [isFlipping]);

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        animate={
          flipping
            ? { rotateY: [0, 180, 360, 540, 720], scale: [1, 1.2, 1] }
            : { rotateY: 0, scale: 1 }
        }
        transition={{ duration: 0.55, ease: "easeInOut" }}
        className="text-6xl select-none cursor-default"
        style={{ display: "inline-block" }}
      >
        {result === "tails" ? "🌙" : "☀️"}
      </motion.div>
      <AnimatePresence mode="wait">
        {result && !flipping && (
          <motion.div
            key={result}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`text-lg font-bold px-4 py-1 rounded-full ${
              result === "heads"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {result === "heads" ? "앞면 ☀️ (+1)" : "뒷면 🌙 (-1)"}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
