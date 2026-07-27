import Link from "next/link";
import {
  ArrowRight,
  Globe2,
  MessageSquareText,
  Network,
  Rocket,
} from "lucide-react";

const visionItems = [
  {
    title: "Grow the Network",
    description:
      "Build strong regional communities of trusted independent florists.",
    icon: Network,
  },
  {
    title: "Listen and Improve",
    description:
      "Shape the platform through real conversations with working florists.",
    icon: MessageSquareText,
  },
  {
    title: "Expand the Platform",
    description:
      "Introduce websites, mobile tools, analytics, and practical business technology.",
    icon: Globe2,
  },
];

export default function HomeVision() {
  return (
    <section className="bg-white py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="overflow-hidden rounded-[2rem] bg-gray-950 text-white shadow-xl">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div className="p-8 sm:p-12 lg:p-16">
              <div className="flex w-fit items-center gap-2 rounded-full bg-purple-500/15 px-4 py-2 text-sm font-bold text-purple-200">
                <Rocket className="h-4 w-4" />
                The GetBloomDirect Vision
              </div>

              <h2 className="mt-7 max-w-2xl text-4xl font-black tracking-tight sm:text-5xl">
                We are building more than an order network.
              </h2>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-300">
                GetBloomDirect is growing into a florist-first technology
                platform designed to help independent shops connect, operate,
                and grow without surrendering control of their businesses.
              </p>

              <Link
                href="/vision"
                className="mt-9 inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-7 py-4 text-lg font-bold text-white transition hover:bg-purple-500"
              >
                Explore Our Vision
                <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="mt-3 text-sm tracking-wide text-purple-100">
                Discover the long-term vision behind GetBloomDirect.
              </p>
            </div>

            <div className="grid gap-px bg-white/10">
              {visionItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="flex gap-5 bg-gray-900 p-8 sm:p-10"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-400/10 text-green-400">
                      <Icon className="h-6 w-6" />
                    </div>

                    <div>
                      <h3 className="text-xl font-black">{item.title}</h3>
                      <p className="mt-2 leading-7 text-gray-400">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}