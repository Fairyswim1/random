export type ScreenShareFailure =
  | "ios"
  | "android"
  | "unsupported"
  | "insecure"
  | "denied"
  | "cancelled"
  | "unknown";

export function getScreenShareErrorMessage(reason: ScreenShareFailure): string {
  switch (reason) {
    case "ios":
      return "iPhone·iPad는 웹 브라우저에서 화면 공유가 불가능합니다.";
    case "android":
      return "Android 태블릿·폰의 Chrome에서도 웹 화면 공유는 지원되지 않습니다. 모둠 대표는 Windows PC, Mac, Chromebook을 사용해 주세요.";
    case "unsupported":
      return "이 환경에서는 화면 공유가 지원되지 않습니다. Windows PC, Mac, Chromebook의 Chrome 또는 Edge를 사용해 주세요.";
    case "insecure":
      return "화면 공유는 HTTPS 또는 localhost에서만 가능합니다. 배포된 사이트(https://...) 주소로 접속하거나, PC에서는 http://localhost:3000 을 사용해 주세요. Wi-Fi IP 주소(http://192.168...)로는 공유가 안 됩니다.";
    case "denied":
      return "화면 공유 권한이 거부되었습니다. 주소창 왼쪽 자물쇠(권한)에서 화면 공유를 허용해 주세요.";
    case "cancelled":
      return "화면 선택 창에서 공유할 화면을 고른 뒤 「공유」를 눌러 주세요.";
    default:
      return "화면 공유를 시작하지 못했습니다. Chrome/Edge에서 다시 시도해 주세요.";
  }
}

function classifyDisplayMediaError(error: unknown): ScreenShareFailure {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return "denied";
    }
    if (error.name === "AbortError" || error.name === "NotFoundError") {
      return "cancelled";
    }
    if (error.name === "SecurityError" || error.name === "NotSupportedError") {
      return "insecure";
    }
  }
  return "unknown";
}

export async function requestScreenShareStream(): Promise<MediaStream> {
  const { isIosDevice, isAndroidDevice } = await import("./deviceSupport");
  if (isIosDevice()) {
    throw new Error("ios");
  }
  if (isAndroidDevice()) {
    throw new Error("android");
  }

  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
    throw new Error("unsupported");
  }

  if (!window.isSecureContext) {
    throw new Error("insecure");
  }

  const attempts: DisplayMediaStreamOptions[] = [
    { video: true, audio: false },
    { video: true },
  ];

  let lastError: unknown;
  for (const options of attempts) {
    try {
      return await navigator.mediaDevices.getDisplayMedia(options);
    } catch (error) {
      lastError = error;
      const reason = classifyDisplayMediaError(error);
      if (reason === "denied" || reason === "cancelled") {
        throw new Error(reason);
      }
    }
  }

  throw new Error(classifyDisplayMediaError(lastError));
}
