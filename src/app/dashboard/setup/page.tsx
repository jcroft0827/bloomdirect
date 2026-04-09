// /app/dashboard/setup/page.tsx
import { redirect } from "next/navigation";
import { connectToDB } from "@/lib/mongoose";
import { getServerSession } from "next-auth"; // If using NextAuth
import authOptions from "@/lib/auth";
import Shop from "@/models/Shop";

interface IShop {
  _id: string;
  email: string;
  onboardingComplete: boolean;
  setupProgress: {
    businessInfo: boolean;
    paymentMethods: boolean;
    deliverySettings: boolean;
    financialSettings: boolean;
    featuredBouquet: boolean;
  };
}

export default async function SetupHome() {
  await connectToDB();

  // 1. Get the current user's session to find their shop
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }

  // 2. Fetch the shop data using the email from the session
  const shop = await Shop.findOne({ email: session.user.email }).lean() as IShop | null;

  if (!shop) {
    redirect("/register");
  }

  // 3. Handle completed onboarding
  if (shop.onboardingComplete) {
    redirect("/dashboard");
  }

  // 4. Define step order
  const steps = [
    { key: "businessInfo", path: "/dashboard/setup/business" },
    { key: "paymentMethods", path: "/dashboard/setup/payments" },
    { key: "deliverySettings", path: "/dashboard/setup/delivery" },
    { key: "financialSettings", path: "/dashboard/setup/financials" },
    { key: "featuredBouquet", path: "/dashboard/setup/featured-bouquet" },
  ] as const;

  // 5. Find the first incomplete step in setupProgress
  const currentStep = steps.find(step => !shop.setupProgress[step.key as keyof IShop['setupProgress']]);

  // 6. Redirect to the correct path
  const targetPath = currentStep
    ? currentStep.path
    : "/dashboard/setup/business";

  redirect(targetPath);
}
