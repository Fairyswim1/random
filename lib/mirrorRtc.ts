export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: ICE_SERVERS });
}

export async function pushIceCandidate(
  db: import("firebase/database").Database,
  path: string,
  candidate: RTCIceCandidate
) {
  const { ref, push, set } = await import("firebase/database");
  const key = push(ref(db, path)).key;
  if (!key) return;
  await set(ref(db, `${path}/${key}`), candidate.toJSON());
}

export function listenIceCandidates(
  db: import("firebase/database").Database,
  path: string,
  pc: RTCPeerConnection,
  processed: Set<string>
): () => void {
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;

  (async () => {
    const { ref, onChildAdded } = await import("firebase/database");
    if (cancelled) return;
    unsubscribe = onChildAdded(ref(db, path), async (snap) => {
      if (processed.has(snap.key!)) return;
      processed.add(snap.key!);
      const data = snap.val() as RTCIceCandidateInit;
      if (!data?.candidate) return;
      try {
        await pc.addIceCandidate(data);
      } catch {
        // ICE can arrive after connection is established
      }
    });
  })();

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}
