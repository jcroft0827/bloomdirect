import { ArrowRight, BookOpen, LifeBuoy, Mail } from "lucide-react";
import Link from "next/link";

const supportOptions = [
  {
    icon: BookOpen,
    title: "Setup guidance",
    description:
      "Find the fastest path through account setup, BloomWebsites, catalog import, payments, domains, and going live.",
  },
  {
    icon: LifeBuoy,
    title: "Operational help",
    description:
      "Get help with orders, delivery and pickup, refunds, reports, integrations, and day-to-day workflows.",
  },
  {
    icon: Mail,
    title: "Talk to GetBloomDirect",
    description:
      "If something is unclear or not behaving as expected, reach out directly instead of hunting for an answer.",
  },
];

export default function HomeSupport() {
  return (
    <section id="support" className="bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-purple-700">
              Support when you need it
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Help should be easy to find.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              Whether you&apos;re setting up a BloomWebsite or working inside the
              florist network, the Support hub gives you a clear place to start
              and a direct way to reach GetBloomDirect when you need a hand.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/support"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-purple-700 px-6 py-3 text-sm font-black text-white transition hover:bg-purple-800"
              >
                Visit Support
                <ArrowRight size={16} />
              </Link>
              <a
                href="mailto:getbloomdirect@gmail.com"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
              >
                Email Support
              </a>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {supportOptions.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
                  <Icon size={21} />
                </div>
                <h3 className="mt-5 text-base font-black text-slate-950">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
