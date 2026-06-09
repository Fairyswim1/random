"use client";

import { useEffect, useRef } from "react";
import { GameState } from "@/lib/gameStore";
import { playMoveSound, playResultSound } from "@/lib/gameSounds";

export function useGameSounds(gameState: GameState, enabled = true) {
  const prevPosition = useRef<number | null>(null);
  const prevStatus = useRef<GameState["status"] | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const { status, currentPosition } = gameState;

    if (!initialized.current) {
      initialized.current = true;
      prevPosition.current = currentPosition;
      prevStatus.current = status;
      return;
    }

    if (
      status === "flipping" &&
      prevPosition.current !== null &&
      currentPosition !== prevPosition.current
    ) {
      playMoveSound(currentPosition > prevPosition.current ? 1 : -1);
    }

    if (status === "results" && prevStatus.current === "flipping") {
      playResultSound();
    }

    prevPosition.current = currentPosition;
    prevStatus.current = status;
  }, [gameState.currentPosition, gameState.status, enabled]);
}
