"use client";

import { useEffect, useRef, useState } from "react";
import { getDb } from "./firebase";
import { signalingRef } from "./mirrorStore";
import { createPeerConnection, listenIceCandidates, pushIceCandidate } from "./mirrorRtc";

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

  useEffect(() => {
    if (!activeGroupId) {
      setStream(null);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    const groupId = activeGroupId;
    const viewerId = getViewerId();
    let unsubAnswer: (() => void) | null = null;

    const teardown = async () => {
      iceCleanupRef.current?.();
      iceCleanupRef.current = null;
      unsubAnswer?.();
      unsubAnswer = null;
      pcRef.current?.close();
      pcRef.current = null;
      const db = await getDb();
      const { ref, remove } = await import("firebase/database");
      await remove(ref(db, signalingRef(groupId, viewerId)));
    };

    const connect = async () => {
      setStatus("connecting");
      setStream(null);
      await teardown();

      if (cancelled) return;

      const db = await getDb();
      const { ref, onValue, set } = await import("firebase/database");
      const basePath = signalingRef(groupId, viewerId);

      const pc = createPeerConnection();
      pcRef.current = pc;

      pc.addTransceiver("video", { direction: "recvonly" });

      pc.ontrack = (event) => {
        if (event.streams[0]) {
          setStream(event.streams[0]);
          setStatus("connected");
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          setStatus("waiting");
          setStream(null);
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

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await set(ref(db, basePath), {
        offer: { type: offer.type, sdp: offer.sdp },
      });

      unsubAnswer = onValue(ref(db, `${basePath}/answer`), async (snap) => {
        const answer = snap.val() as RTCSessionDescriptionInit | null;
        if (!answer || pc.signalingState !== "have-local-offer") return;
        try {
          await pc.setRemoteDescription(answer);
        } catch {
          // ignore duplicate answer
        }
      });

      if (!cancelled) {
        setStatus("waiting");
      }
    };

    void connect();

    return () => {
      cancelled = true;
      void teardown();
      setStatus("idle");
      setStream(null);
    };
  }, [activeGroupId]);

  return { stream, status };
}
