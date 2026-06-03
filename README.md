# 🎲 랜덤워크 동전던지기 베팅 게임

확률과 통계 수업용 공개수업 도입 활동 — **랜덤워크**를 동전던지기 베팅 게임으로 체험합니다.

## 게임 방법

1. **교사**: 새 라운드 시작 → 베팅 열기
2. **학생**: 조별로 코인 분할 배팅 (초기 10코인)
3. **교사**: 베팅 마감 → 동전 던지기 시작
4. 정확한 위치를 맞춘 조만 **배팅 코인의 2배** 획득
5. 누적 코인 기준 순위 경쟁!

## 기술 스택

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Animation**: Framer Motion
- **Realtime DB**: Firebase Realtime Database
- **Deploy**: Vercel

---

## 🔥 Firebase 설정 방법

### 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. **새 프로젝트** 생성
3. **Realtime Database** 메뉴 → **데이터베이스 만들기**
4. 시작 모드: **테스트 모드** 선택 (규칙 설정 전 임시)
5. 지역: **asia-southeast1** (싱가포르) 권장

### 2. 보안 규칙 설정 (Realtime Database)

Firebase Console → Realtime Database → 규칙 탭:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

> ⚠️ 프로덕션에서는 인증 기반 규칙으로 변경하세요.

### 3. 웹 앱 등록 & 설정값 복사

1. 프로젝트 설정(⚙️) → **일반** 탭
2. **앱 추가** → **웹(</>) 아이콘**
3. 앱 닉네임 입력 후 등록
4. **SDK 설정** 섹션의 firebaseConfig 값 복사

### 4. 환경 변수 설정

`.env.local` 파일을 열고 복사한 값을 입력:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

## 🚀 Vercel 배포 방법

1. [Vercel](https://vercel.com) 로그인 → **Add New Project**
2. GitHub 저장소 `Fairyswim1/random` 선택 → Import
3. **Environment Variables** 섹션에서 위 `.env.local`의 모든 값 입력
4. **Deploy** 클릭

---

## 로컬 실행

```bash
npm install
# .env.local 파일에 Firebase 설정 입력 후:
npm run dev
```

접속:
- 홈: http://localhost:3000
- 교사: http://localhost:3000/teacher
- 학생: http://localhost:3000/student
