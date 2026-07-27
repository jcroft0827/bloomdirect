// /lib/auth/getAdminSession.ts

import { getServerSession } from "next-auth";
import authOptions from "../auth";
import { redirect } from "next/navigation";

export async function getAdminSession() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/login");
    }

    if (session.user.role !== "admin") {
        redirect("/dashboard");
    }

    return session;
}