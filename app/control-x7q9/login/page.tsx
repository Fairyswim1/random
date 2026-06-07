import { Suspense } from "react";
import TeacherLoginForm from "./TeacherLoginForm";

export default function TeacherLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
          <div className="text-gray-400">로딩 중...</div>
        </main>
      }
    >
      <TeacherLoginForm />
    </Suspense>
  );
}
