import { getDb } from "./firebase";

export interface MirrorControl {
  activeGroupId: string | null;
  activeGroupName: string | null;
  updatedAt: number;
}

export interface ViewerSignal {
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
}

const MIRROR_CONTROL_REF = "mirrorControl";
const MIRROR_SIGNALING_REF = "mirrorSignaling";

export const defaultMirrorControl: MirrorControl = {
  activeGroupId: null,
  activeGroupName: null,
  updatedAt: 0,
};

export function subscribeMirrorControl(cb: (state: MirrorControl) => void): () => void {
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;

  (async () => {
    const { ref, onValue } = await import("firebase/database");
    if (cancelled) return;
    const db = await getDb();
    if (cancelled) return;
    unsubscribe = onValue(ref(db, MIRROR_CONTROL_REF), (snap) => {
      cb(snap.val() ?? defaultMirrorControl);
    });
  })();

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

export async function setActiveMirrorGroup(groupId: string | null, groupName: string | null) {
  const { ref, set } = await import("firebase/database");
  const db = await getDb();
  await set(ref(db, MIRROR_CONTROL_REF), {
    activeGroupId: groupId,
    activeGroupName: groupName,
    updatedAt: Date.now(),
  });
}

export async function setBroadcasterOnline(groupId: string, online: boolean) {
  const { ref, set, remove } = await import("firebase/database");
  const db = await getDb();
  const path = `${MIRROR_SIGNALING_REF}/${groupId}/broadcaster`;
  if (online) {
    await set(ref(db, path), { online: true, updatedAt: Date.now() });
  } else {
    await remove(ref(db, path));
    await remove(ref(db, `${MIRROR_SIGNALING_REF}/${groupId}/viewers`));
  }
}

export function subscribeBroadcasterOnline(
  groupId: string,
  cb: (online: boolean) => void
): () => void {
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;

  (async () => {
    const { ref, onValue } = await import("firebase/database");
    if (cancelled) return;
    const db = await getDb();
    if (cancelled) return;
    unsubscribe = onValue(ref(db, `${MIRROR_SIGNALING_REF}/${groupId}/broadcaster`), (snap) => {
      cb(!!snap.val()?.online);
    });
  })();

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

export function signalingRef(groupId: string, viewerId: string) {
  return `${MIRROR_SIGNALING_REF}/${groupId}/viewers/${viewerId}`;
}
