import BloomWebsiteDomainSettings from "@/components/websites/BloomWebsiteDomainSettings";
import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

type BloomWebsiteLean = {
  siteName: string;
  customDomain?: string;
  domainVerified?: boolean;
  domainVerificationToken?: string;
  domainVerifiedAt?: Date | null;
  status?: "preview" | "live" | "paused";
};

export default async function BloomWebsiteDomainPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  await connectToDB();

  const website = (await BloomWebsite.findOne({
    shop: session.user.id,
  })
    .select(
      "siteName customDomain domainVerified domainVerificationToken domainVerifiedAt status",
    )
    .lean()) as BloomWebsiteLean | null;

  if (!website) {
    redirect("/dashboard/websites");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link
          href="/dashboard/websites"
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft size={17} />
          Back to Websites
        </Link>

        <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-purple-600">
          BloomWebsites Domain
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
          Connect a domain to {website.siteName}.
        </h1>

        <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
          First prove that your shop controls the domain. Bloom will not route
          customers to it until ownership is verified and the remaining launch
          requirements are complete.
        </p>
      </div>

      <BloomWebsiteDomainSettings
        initialDomain={website.customDomain || ""}
        initialVerified={Boolean(website.domainVerified)}
        initialVerifiedAt={website.domainVerifiedAt?.toISOString() || null}
        initialVerificationToken={website.domainVerificationToken || ""}
        initialStatus={website.status || "preview"}
      />
    </div>
  );
}
