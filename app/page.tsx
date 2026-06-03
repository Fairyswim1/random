"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <div className="text-7xl mb-4">🎲</div>
        <h1 className="text-4xl font-bold text-indigo-800 mb-2">랜덤워크 베팅 게임</h1>
        <p className="text-lg text-indigo-600">동전을 던져 랜덤워크를 체험해보세요!</p>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-md">
        <motion.button
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          onClick={() => router.push("/control-x7q9")}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all flex flex-col items-center gap-3"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
        >
          <span className="text-5xl">👩‍🏫</span>
          <span className="text-xl font-bold">교사용</span>
          <span className="text-sm opacity-80">게임 진행 및 관리</span>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          onClick={() => router.push("/student")}
          className="flex-1 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all flex flex-col items-center gap-3"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
        >
          <span className="text-5xl">🎓</span>
          <span className="text-xl font-bold">학생용</span>
          <span className="text-sm opacity-80">베팅 및 예측</span>
        </motion.button>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-12 text-sm text-gray-500"
      >
        확률과 통계 · 랜덤워크 체험 수업
      </motion.p>
    </main>
  );
}
