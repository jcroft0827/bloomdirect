// src/app/dashboard/page.tsx
import DashboardClient from "./DashboardClient";
import Providers from "@/components/Providers";

export default function DashboardPage() {
  return (
    <Providers>
      <DashboardClient />
    </Providers>
  );
}



// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
// import { redirect } from "next/navigation";
// import Link from "next/link";
// import Providers from "@/components/Providers";

// export default async function DashboardPage() {
//   const session = await getServerSession(authOptions);

//   if (!session) {
//     redirect("/login");
//   }

//   // This entire page is now a Server Component until here
//   // We switch to Client only for the UI that needs session
//   return (
//     <Providers>
//       <DashboardClient session={session} />
//     </Providers>
//   );
// }

// // New client-only component
// function DashboardClient({ session }: any) {
//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <header className="bg-green-700 text-white shadow-lg">
//         <div className="max-w-6xl mx-auto px-4 py-5 flex justify-between items-center">
//           <h1 className="text-2xl font-bold">BloomDirect</h1>
//           <div className="flex items-center gap-4">
//             <span className="text-sm">Welcome, {session.user?.name}!</span>
//             <form action="/api/auth/signout" method="post">
//               <button className="text-sm underline">Log out</button>
//             </form>
//           </div>
//         </div>
//       </header>

//       <div className="mt-12 text-center">
//         <Link
//           href="/dashboard/incoming"
//           className="text-xl underline text-green-600"
//         >
//           View Incoming Orders →
//         </Link>
//       </div>

//       {/* Rest of your dashboard exactly the same */}
//       <main className="max-w-6xl mx-auto px-4 py-12">
//         <div className="text-center mb-12">
//           <h2 className="text-4xl font-bold text-gray-800 mb-4">
//             You’re live on BloomDirect!
//           </h2>
//           <p className="text-xl text-gray-600">
//             Send your first order and keep the full $20–$27 profit.
//           </p>
//         </div>

//         <div className="flex justify-center">
//           <Link
//             href="/dashboard/new-order"
//             className="bg-green-600 hover:bg-green-700 text-white font-bold text-2xl px-12 py-8 rounded-xl shadow-xl transition transform hover:scale-105"
//           >
//             Send New Order (100 % + $20–$27 model)
//           </Link>
//         </div>

//         <div className="grid grid-cols-3 gap-8 mt-16 max-w-3xl mx-auto">
//           <div className="bg-white rounded-lg shadow p-8 text-center">
//             <div className="text-4xl font-bold text-green-600">$0</div>
//             <div className="text-gray-600">Earned this month</div>
//           </div>
//           <div className="bg-white rounded-lg shadow p-8 text-center">
//             <div className="text-4xl font-bold text-blue-600">0</div>
//             <div className="text-gray-600">Orders sent</div>
//           </div>
//           <div className="bg-white rounded-lg shadow p-8 text-center">
//             <div className="text-4xl font-bold text-purple-600">0</div>
//             <div className="text-gray-600">Shops in network</div>
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// }
