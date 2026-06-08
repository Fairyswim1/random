export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:443",
      "turns:openrelay.metered.ca:443?transport=tcp",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
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

/** Listen for all ICE candidates (including ones already in Firebase before subscribe). */
export function listenIceCandidates(
  db: import("firebase/database").Database,
  path: string,
  pc: RTCPeerConnection,
  processed: Set<string>
): () => void {
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;

  (async () => {
    const { ref, onValue } = await import("firebase/database");
    if (cancelled) return;
    unsubscribe = onValue(ref(db, path), async (snap) => {
      const val = snap.val() as Record<string, RTCIceCandidateInit> | null;
      if (!val) return;
      for (const [key, data] of Object.entries(val)) {
        if (processed.has(key) || !data?.candidate) continue;
        processed.add(key);
        try {
          await pc.addIceCandidate(data);
        } catch {
          // ICE can arrive after connection is established
        }
      }
    });
  })();

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

export async function clearSignalingIce(
  db: import("firebase/database").Database,
  basePath: string
) {
  const { ref, remove } = await import("firebase/database");
  await Promise.all([
    remove(ref(db, `${basePath}/viewerIce`)),
    remove(ref(db, `${basePath}/broadcasterIce`)),
  ]);
}
