"use client";
import dynamic from "next/dynamic";

const TeacherClient = dynamic(() => import("./TeacherClient"), { ssr: false });

export default function Page() {
  return <TeacherClient />;
}
