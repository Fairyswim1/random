"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getDb } from "./firebase";
import { setBroadcasterOnline, signalingRef } from "./mirrorStore";
import {
  clearSignalingIce,
  createPeerConnection,
  listenIceCandidates,
  pushIceCandidate,
} from "./mirrorRtc";
import { getScreenShareErrorMessage, requestScreenShareStream } from "./screenShare";

type ViewerSession = {
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
};

function isPeerLive(pc: RTCPeerConnection | undefined): boolean {
  return !!pc && pc.connectionState !== "failed" && pc.connectionState !== "closed";
}

export function useMirrorBroadcaster(groupId: string | null, isActive: boolean) {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const connectingRef = useRef<Set<string>>(new Set());
  const iceCleanupsRef = useRef<Map<string, () => void>>(new Map());

  const closePeer = useCallback(async (viewerId: string) => {
    iceCleanupsRef.current.get(viewerId)?.();
    iceCleanupsRef.current.delete(viewerId);
    peersRef.current.get(viewerId)?.close();
    peersRef.current.delete(viewerId);
    connectingRef.current.delete(viewerId);
  }, []);

  const closeAllPeers = useCallback(async () => {
    for (const viewerId of [...peersRef.current.keys()]) {
      await closePeer(viewerId);
    }
  }, [closePeer]);

  const stopSharing = useCallback(async () => {
    await closeAllPeers();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (groupId) {
      await setBroadcasterOnline(groupId, false);
    }
    setSharing(false);
  }, [closeAllPeers, groupId]);

  const connectViewer = useCallback(
    async (viewerId: string, offer: RTCSessionDescriptionInit) => {
      if (!groupId || !streamRef.current || connectingRef.current.has(viewerId)) return;

      const existing = peersRef.current.get(viewerId);
      if (isPeerLive(existing)) return;

      if (existing) {
        await closePeer(viewerId);
      }

      connectingRef.current.add(viewerId);

      try {
        const db = await getDb();
        const basePath = signalingRef(groupId, viewerId);
        await clearSignalingIce(db, basePath);

        const pc = createPeerConnection();
        peersRef.current.set(viewerId, pc);

        streamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, streamRef.current!);
        });

        const processedIce = new Set<string>();

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            void pushIceCandidate(db, `${basePath}/broadcasterIce`, event.candidate);
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "failed" || pc.connectionState === "closed") {
            void closePeer(viewerId);
          }
        };

        iceCleanupsRef.current.set(
          viewerId,
          listenIceCandidates(db, `${basePath}/viewerIce`, pc, processedIce)
        );

        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        const { ref, update } = await import("firebase/database");
        await update(ref(db, basePath), {
          answer: { type: answer.type, sdp: answer.sdp },
        });
      } finally {
        connectingRef.current.delete(viewerId);
      }
    },
    [groupId, closePeer]
  );

  const startSharing = useCallback(async () => {
    if (!groupId) {
      setError("모둠을 먼저 선택하세요");
      return;
    }
    setError("");
    try {
      const stream = await requestScreenShareStream();
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        void stopSharing();
      });
      streamRef.current = stream;
      await setBroadcasterOnline(groupId, true);
      setSharing(true);
    } catch (error) {
      const reason =
        error instanceof Error &&
        ["ios", "android", "unsupported", "insecure", "denied", "cancelled", "unknown"].includes(
          error.message
        )
          ? (error.message as
              | "ios"
              | "android"
              | "unsupported"
              | "insecure"
              | "denied"
              | "cancelled"
              | "unknown")
          : "unknown";
      setError(getScreenShareErrorMessage(reason));
    }
  }, [groupId, stopSharing]);

  useEffect(() => {
    if (!groupId || !sharing || !isActive) return;

    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      const { ref, onValue } = await import("firebase/database");
      const db = await getDb();
      if (cancelled) return;

      unsubscribe = onValue(ref(db, `mirrorSignaling/${groupId}/viewers`), (snap) => {
        const viewers = (snap.val() ?? {}) as Record<string, ViewerSession>;
        const activeIds = new Set(Object.keys(viewers));

        for (const viewerId of peersRef.current.keys()) {
          if (!activeIds.has(viewerId)) {
            void closePeer(viewerId);
          }
        }

        for (const [viewerId, session] of Object.entries(viewers)) {
          if (!session.offer) continue;
          const pc = peersRef.current.get(viewerId);
          if (isPeerLive(pc) || connectingRef.current.has(viewerId)) continue;
          void connectViewer(viewerId, session.offer).catch(() => {
            void closePeer(viewerId);
          });
        }
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [groupId, sharing, isActive, connectViewer, closePeer]);

  useEffect(() => {
    if (!isActive && sharing) {
      void closeAllPeers();
    }
  }, [isActive, sharing, closeAllPeers]);

  const groupIdRef = useRef(groupId);
  groupIdRef.current = groupId;

  useEffect(() => {
    return () => {
      void closeAllPeers();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const id = groupIdRef.current;
      if (id) {
        void setBroadcasterOnline(id, false);
      }
    };
  }, [closeAllPeers]);

  return { sharing, error, startSharing, stopSharing };
}
