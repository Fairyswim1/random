export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

/** Phone·tablet browsers (iOS/Android) cannot use getDisplayMedia for screen capture. */
export function isMobileBrowser(): boolean {
  return isIosDevice() || isAndroidDevice();
}

export function canShareScreenInBrowser(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  if (isMobileBrowser()) return false;
  return !!navigator.mediaDevices?.getDisplayMedia && window.isSecureContext;
}

export function getShareDeviceHint(): string | null {
  if (isIosDevice()) {
    return "iPhone·iPad는 브라우저에서 화면 공유가 불가능합니다. 이 기기로는 /student/watch 에서 다른 모둠 화면만 볼 수 있습니다.";
  }
  if (isAndroidDevice()) {
    return "Android 태블릿·폰의 Chrome에서도 웹 화면 공유는 지원되지 않습니다. 모둠 대표는 Windows PC, Mac, Chromebook에서 /student/share 를 열어 주세요. 이 태블릿은 /student/watch 로 시청만 가능합니다.";
  }
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "화면 공유는 HTTPS(Vercel 배포 주소) 또는 localhost에서만 가능합니다.";
  }
  if (!navigator.mediaDevices?.getDisplayMedia) {
    return "이 브라우저는 화면 공유를 지원하지 않습니다. Windows·Mac·Chromebook에서 Chrome 또는 Edge를 사용해 주세요.";
  }
  return null;
}
