// /app/dashboard/setup/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";

export default async function SetupHome() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  redirect("/dashboard/settings");
}
