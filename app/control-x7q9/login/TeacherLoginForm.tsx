"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function TeacherLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/teacher-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password: password.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "로그인에 실패했습니다.");
        return;
      }

      const from = searchParams.get("from");
      window.location.replace(
        from && from.startsWith("/control-x7q9") && from !== "/control-x7q9/login"
          ? from
          : "/control-x7q9"
      );
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mb-3 text-5xl">🔒</div>
          <h1 className="text-2xl font-bold text-gray-800">교사 전용 페이지</h1>
          <p className="mt-2 text-sm text-gray-500">비밀번호를 입력하세요</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="교사 비밀번호"
            autoFocus
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:bg-gray-300"
          >
            {loading ? "확인 중..." : "입장하기"}
          </button>
        </form>
        <button
          onClick={() => router.push("/")}
          className="mt-4 w-full text-sm text-gray-400 hover:text-gray-600"
        >
          ← 홈으로
        </button>
      </div>
    </main>
  );
}
