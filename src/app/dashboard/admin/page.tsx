// /app/dashboard/admin/page.ts

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import Providers from "@/components/Providers";

import AdminPanelClient from "./AdminPanelClient";
import authOptions from "@/lib/auth";

export default async function AdminPanelPage() {

    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/login");
    }

    if (session.user.role !== "admin") {
        redirect("/dashboard");
    }

    return (
        <Providers>
            <AdminPanelClient />
        </Providers>
    );
}