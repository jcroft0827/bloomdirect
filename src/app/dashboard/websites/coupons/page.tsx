import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import CouponsManager from "@/components/websites/CouponsManager";

export default async function CouponsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  await connectToDB();
  const website = await BloomWebsite.findOne({shop: session.user.id}).select("_id").lean();
  if (!website) redirect("/dashboard/websites");
  return <CouponsManager />;
}
