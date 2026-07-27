import { getAdminSession } from "@/lib/auth/getAdminSession";
import AdminNavigation from "./components/AdminNavigation";
import { ReactNode } from "react";

type AdminLayoutProps = {
    children: ReactNode;
};

export default async function AdminLayout({
    children,
}: AdminLayoutProps) {
    const session = await getAdminSession();

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <AdminNavigation 
                userName={session.user.name || "Administrator"}
                userEmail={session.user.email || ""}
            />

            <main className="lg:pl-72">
                <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                    {children}
                </div>
            </main>
        </div>
    );
}