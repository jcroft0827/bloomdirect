import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import EmailHistoryClient from "@/components/communications/EmailHistoryClient";
import { authOptions } from "@/lib/auth";

export default async function CommunicationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  return <EmailHistoryClient />;
}
