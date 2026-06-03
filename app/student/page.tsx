"use client";
import dynamic from "next/dynamic";

const StudentClient = dynamic(() => import("./StudentClient"), { ssr: false });

export default function Page() {
  return <StudentClient />;
}
