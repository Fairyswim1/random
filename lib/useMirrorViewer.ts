"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getDb } from "./firebase";
import { signalingRef } from "./mirrorStore";
import {
  clearSignalingIce,
  createPeerConnection,
  listenIceCandidates,
  pushIceCandidate,
} from "./mirrorRtc";

function getViewerId(): string {
  const key = "mirrorViewerId";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function useMirrorViewer(activeGroupId: string | null) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "waiting">("idle");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const iceCleanupRef = useRef<(() => void) | null>(null);
  const unsubAnswerRef = useRef<(() => void) | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectRef = useRef<(() => void) | null>(null);

  const teardown = useCallback(async (groupId: string, viewerId: string) => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    iceCleanupRef.current?.();
    iceCleanupRef.current = null;
    unsubAnswerRef.current?.();
    unsubAnswerRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    const db = await getDb();
    const { ref, remove } = await import("firebase/database");
    await remove(ref(db, signalingRef(groupId, viewerId)));
  }, []);

  useEffect(() => {
    if (!activeGroupId) {
      setStream(null);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    const groupId = activeGroupId;
    const viewerId = getViewerId();

    const scheduleRetry = () => {
      if (cancelled || retryTimerRef.current) return;
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        if (!cancelled) connectRef.current?.();
      }, 3000);
    };

    const connect = async () => {
      setStatus("connecting");
      setStream(null);
      await teardown(groupId, viewerId);

      if (cancelled) return;

      const db = await getDb();
      const { ref, onValue, set } = await import("firebase/database");
      const basePath = signalingRef(groupId, viewerId);
      await clearSignalingIce(db, basePath);

      const pc = createPeerConnection();
      pcRef.current = pc;

      pc.addTransceiver("video", { direction: "recvonly" });

      pc.ontrack = (event) => {
        const mediaStream = event.streams[0] ?? new MediaStream([event.track]);
        setStream(mediaStream);
        setStatus("connected");
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setStatus("connected");
          return;
        }
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setStatus("waiting");
          setStream(null);
          scheduleRetry();
        }
      };

      const processedIce = new Set<string>();
      iceCleanupRef.current = listenIceCandidates(
        db,
        `${basePath}/broadcasterIce`,
        pc,
        processedIce
      );

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void pushIceCandidate(db, `${basePath}/viewerIce`, event.candidate);
        }
      };

      unsubAnswerRef.current = onValue(ref(db, `${basePath}/answer`), async (snap) => {
        const answer = snap.val() as RTCSessionDescriptionInit | null;
        if (!answer?.sdp || pc.signalingState !== "have-local-offer") return;
        try {
          await pc.setRemoteDescription(answer);
        } catch {
          // ignore duplicate answer
        }
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await set(ref(db, basePath), {
        offer: { type: offer.type, sdp: offer.sdp },
      });

      if (!cancelled) {
        setStatus("waiting");
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          if (!cancelled && pcRef.current && pcRef.current.connectionState !== "connected") {
            scheduleRetry();
          }
        }, 8000);
      }
    };

    connectRef.current = () => {
      void connect();
    };

    void connect();

    return () => {
      cancelled = true;
      connectRef.current = null;
      void teardown(groupId, viewerId);
      setStatus("idle");
      setStream(null);
    };
  }, [activeGroupId, teardown]);

  return { stream, status };
}
