"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getDb } from "./firebase";
import { setBroadcasterOnline, signalingRef } from "./mirrorStore";
import { createPeerConnection, listenIceCandidates, pushIceCandidate } from "./mirrorRtc";
import { getScreenShareErrorMessage, requestScreenShareStream } from "./screenShare";

type ViewerSession = {
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
};

export function useMirrorBroadcaster(groupId: string | null, isActive: boolean) {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const processedOffersRef = useRef<Set<string>>(new Set());
  const iceCleanupsRef = useRef<Map<string, () => void>>(new Map());

  const closePeer = useCallback((viewerId: string) => {
    iceCleanupsRef.current.get(viewerId)?.();
    iceCleanupsRef.current.delete(viewerId);
    peersRef.current.get(viewerId)?.close();
    peersRef.current.delete(viewerId);
    processedOffersRef.current.delete(viewerId);
  }, []);

  const closeAllPeers = useCallback(() => {
    for (const viewerId of [...peersRef.current.keys()]) {
      closePeer(viewerId);
    }
  }, [closePeer]);

  const stopSharing = useCallback(async () => {
    closeAllPeers();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (groupId) {
      await setBroadcasterOnline(groupId, false);
    }
    setSharing(false);
  }, [closeAllPeers, groupId]);

  const connectViewer = useCallback(
    async (viewerId: string, offer: RTCSessionDescriptionInit) => {
      if (!groupId || !streamRef.current || peersRef.current.has(viewerId)) return;

      const pc = createPeerConnection();
      peersRef.current.set(viewerId, pc);

      streamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, streamRef.current!);
      });

      const db = await getDb();
      const basePath = signalingRef(groupId, viewerId);
      const processedIce = new Set<string>();

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void pushIceCandidate(db, `${basePath}/broadcasterIce`, event.candidate);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          closePeer(viewerId);
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
      processedOffersRef.current.clear();
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
            closePeer(viewerId);
          }
        }

        for (const [viewerId, session] of Object.entries(viewers)) {
          if (session.offer && !session.answer && !processedOffersRef.current.has(viewerId)) {
            processedOffersRef.current.add(viewerId);
            void connectViewer(viewerId, session.offer);
          }
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
      closeAllPeers();
    }
  }, [isActive, sharing, closeAllPeers]);

  const groupIdRef = useRef(groupId);
  groupIdRef.current = groupId;

  useEffect(() => {
    return () => {
      closeAllPeers();
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
