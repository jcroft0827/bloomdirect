import {
  Building2,
  Crown,
  MapPinned,
  Send,
} from "lucide-react";

import { connectToDB } from "@/lib/mongoose";
import Order from "@/models/Order";
import Shop from "@/models/Shop";

type NetworkStat = {
  label: string;
  value: number;
  description: string;
  icon: React.ComponentType<{
    className?: string;
    "aria-hidden"?: boolean;
  }>;
};

async function getNetworkStats(): Promise<NetworkStat[]> {
  try {
    await connectToDB();

    const activeShopFilter = {
      isPublic: true,
      isSuspended: { $ne: true },
    };

    const [
      floristCount,
      orderCount,
      proMemberCount,
      representedStates,
    ] = await Promise.all([
      Shop.countDocuments(activeShopFilter),

      Order.countDocuments({}),

      Shop.countDocuments({
        ...activeShopFilter,
        isPro: true,
      }),

      Shop.distinct("address.state", {
        ...activeShopFilter,
        "address.state": {
          $exists: true,
          $nin: [null, ""],
        },
      }),
    ]);

    const stateCount = representedStates.filter(
      (state): state is string =>
        typeof state === "string" && state.trim().length > 0
    ).length;

    return [
      {
        label: "Florists Joined",
        value: floristCount,
        description: "Independent shops growing the network",
        icon: Building2,
      },
      {
        label: "Orders Sent",
        value: orderCount,
        description: "Orders created through GetBloomDirect",
        icon: Send,
      },
      {
        label: "Bloom Pro Members",
        value: proMemberCount,
        description: "Shops using premium tools",
        icon: Crown,
      },
      {
        label: "States Represented",
        value: stateCount,
        description: "Expanding florist connections nationwide",
        icon: MapPinned,
      },
    ];
  } catch (error) {
    console.error("Failed to load GetBloomDirect network stats:", error);

    return [
      {
        label: "Florists Joined",
        value: 0,
        description: "Independent shops growing the network",
        icon: Building2,
      },
      {
        label: "Orders Sent",
        value: 0,
        description: "Orders created through GetBloomDirect",
        icon: Send,
      },
      {
        label: "Bloom Pro Members",
        value: 0,
        description: "Shops using premium tools",
        icon: Crown,
      },
      {
        label: "States Represented",
        value: 0,
        description: "Expanding florist connections nationwide",
        icon: MapPinned,
      },
    ];
  }
}

function formatStatValue(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export default async function HomeNetworkStats() {
  const stats = await getNetworkStats();

  return (
    <section
      aria-labelledby="network-stats-heading"
      className="border-y border-slate-200 bg-slate-50"
    >
      <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Growing Together
          </p>

          <h2
            id="network-stats-heading"
            className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
          >
            A growing network of independent florists
          </h2>

          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
            Every new shop creates more opportunities for florists to connect,
            fulfill orders, and serve customers without traditional wire fees.
          </p>
        </div>

        <dl className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                    <Icon
                      aria-hidden={true}
                      className="h-5 w-5 text-emerald-700"
                    />
                  </div>

                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Live
                  </span>
                </div>

                <dd className="mt-6 text-4xl font-bold tracking-tight text-slate-950">
                  {formatStatValue(stat.value)}
                </dd>

                <dt className="mt-2 text-base font-semibold text-slate-900">
                  {stat.label}
                </dt>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {stat.description}
                </p>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}