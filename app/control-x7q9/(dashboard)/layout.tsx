import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTeacherAuthCookieName, verifyTeacherAuthToken } from "@/lib/teacherAuth";

export default async function TeacherDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getTeacherAuthCookieName())?.value;

  if (!(await verifyTeacherAuthToken(token))) {
    redirect("/control-x7q9/login");
  }

  return children;
}
