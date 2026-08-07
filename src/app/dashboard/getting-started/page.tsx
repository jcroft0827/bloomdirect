import authOptions from "@/lib/auth";
import { getAuthenticatedShop } from "@/lib/shops/getAuthenticatedShop";
import {
  BadgeCheck,
  Bell,
  BookOpenCheck,
  Boxes,
  CircleDollarSign,
  Code2,
  HeartHandshake,
  MessageSquareText,
  PackageCheck,
  PlayCircle,
  Send,
  Settings2,
  Store,
  Truck,
  UserRoundCheck,
} from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

type Walkthrough = {
  title: string;
  description: string;
  topics: string[];
  icon: typeof PlayCircle;
  proOnly?: boolean;
};

const walkthroughs: Walkthrough[] = [
  {
    title: "Welcome to GetBloomDirect",
    description:
      "A complete introduction to the florist network, the dashboard, and the fastest way to get your shop ready.",
    topics: ["How the network works", "Dashboard overview", "Recommended first steps"],
    icon: PlayCircle,
  },
  {
    title: "Build Your Shop Profile",
    description:
      "Create a trustworthy public presence that helps other florists understand who you are and how you serve customers.",
    topics: ["Business details", "Branding and logo", "Public profile and verification"],
    icon: Store,
  },
  {
    title: "Configure Delivery Settings",
    description:
      "Set the delivery rules GetBloomDirect uses to decide when your shop is eligible to fulfill an order.",
    topics: ["Delivery zones", "Cutoff and same-day rules", "Blackout dates and fees"],
    icon: Truck,
  },
  {
    title: "Add Payment Methods",
    description:
      "Choose how other florists can pay your shop and set the method you prefer to use by default.",
    topics: ["Supported payment methods", "Default payment method", "Receiving eligibility"],
    icon: CircleDollarSign,
  },
  {
    title: "Create and Send an Order",
    description:
      "Learn how delivery details generate eligible florists, how to choose a shop, and how to send a complete order.",
    topics: ["Recipient and delivery details", "Choosing a fulfilling florist", "Reviewing and sending"],
    icon: Send,
  },
  {
    title: "Receive and Fulfill Orders",
    description:
      "Follow the simple incoming-order workflow from acceptance through delivery while keeping the sending florist informed.",
    topics: ["Accepting or declining", "Order communication", "Marking an order delivered"],
    icon: PackageCheck,
  },
  {
    title: "Manage Fulfillment Offerings",
    description:
      "Show sending florists what your shop can create, how much it costs, and which options are currently available.",
    topics: ["Designer’s Choice", "Pricing tiers", "Activation and substitutions"],
    icon: Boxes,
  },
  {
    title: "Messaging and Notifications",
    description:
      "Keep order conversations organized and understand which notifications require your attention.",
    topics: ["Order messages", "Read status", "Important order updates"],
    icon: MessageSquareText,
  },
  {
    title: "Reviews and Verification",
    description:
      "Build confidence across the network through completed orders, verified reviews, and an accurate shop profile.",
    topics: ["Leaving and receiving reviews", "Verification progress", "Network trust"],
    icon: BadgeCheck,
  },
  {
    title: "Settings and Shop Management",
    description:
      "Update the information and operational choices that control how your shop appears and works across GetBloomDirect.",
    topics: ["Business settings", "Financial settings", "Account and security"],
    icon: Settings2,
  },
  {
    title: "Bloom Pro",
    description:
      "See how Bloom Pro expands sending, offerings, reporting, favorites, visibility, and integration capabilities.",
    topics: ["Unlimited sending", "Advanced shop tools", "Priority network features"],
    icon: HeartHandshake,
    proOnly: true,
  },
  {
    title: "POS Integration",
    description:
      "Understand API access, incoming-order actions, webhooks, and how a connected POS can work with GetBloomDirect.",
    topics: ["API credentials", "Order actions", "Webhook configuration"],
    icon: Code2,
    proOnly: true,
  },
];

export default async function GettingStartedPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const shop = await getAuthenticatedShop(session.user.id);

  if (!shop) {
    redirect("/login");
  }

  if (shop.isSuspended) {
    redirect("/dashboard");
  }

  return (
    <main className="h-full overflow-y-auto pb-10">
      <div className="mx-auto w-full max-w-7xl space-y-8 px-4 pb-8 sm:px-6 lg:px-0">
        <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-10">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                <BookOpenCheck size={16} />
                GetBloomDirect Learning Center
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Learn GetBloomDirect at your own pace.
              </h1>
              <p className="mt-4 text-base leading-7 text-gray-600 sm:text-lg">
                This page will become your complete video walkthrough library. For now,
                each lesson outlines exactly what the upcoming video will cover so you
                can understand every part of the platform before the recordings arrive.
              </p>
            </div>

            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700 sm:h-28 sm:w-28">
              <PlayCircle size={52} strokeWidth={1.6} />
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600">
                <PlayCircle size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">12</p>
                <p className="text-sm text-gray-500">Planned walkthroughs</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                <UserRoundCheck size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">All Shops</p>
                <p className="text-sm text-gray-500">Free and Pro guidance</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
                <Bell size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">Coming Soon</p>
                <p className="text-sm text-gray-500">Videos will be added here</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-gray-900">Platform walkthroughs</h2>
            <p className="mt-1 text-gray-600">
              Start with the welcome lesson, then use the remaining guides whenever you
              need help with a specific workflow.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {walkthroughs.map((walkthrough, index) => {
              const Icon = walkthrough.icon;

              return (
                <article
                  key={walkthrough.title}
                  className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                      <Icon size={24} />
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                        Lesson {index + 1}
                      </span>
                      {walkthrough.proOnly && (
                        <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                          Pro Feature
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-gray-900">
                    {walkthrough.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {walkthrough.description}
                  </p>

                  <div className="mt-5 border-t border-gray-100 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      What you’ll learn
                    </p>
                    <ul className="mt-3 space-y-2">
                      {walkthrough.topics.map((topic) => (
                        <li key={topic} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                          {topic}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto pt-6">
                    <div className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500">
                      <PlayCircle size={18} />
                      Video coming soon
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-purple-100 bg-purple-50 p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-purple-950">Need help before the videos arrive?</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-purple-800">
                The walkthrough library is being prepared. Until then, use the Support
                area whenever a workflow is unclear or something does not behave as expected.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-purple-700">
              <HeartHandshake size={20} />
              We’re here to help.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
