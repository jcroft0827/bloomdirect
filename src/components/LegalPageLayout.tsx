import HomeFooter from "@/components/HomeFooter";
import HomeHeader from "@/components/HomeHeader";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type LegalPageLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  lastUpdated: string;
  icon: LucideIcon;
  children: ReactNode;
};

export function LegalPageLayout({
  eyebrow,
  title,
  description,
  lastUpdated,
  icon: Icon,
  children,
}: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-950">
      <HomeHeader />

      <main>
        <section className="relative overflow-hidden border-b border-gray-200 bg-white">
          <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-purple-50 to-transparent" />

          <div className="relative mx-auto max-w-5xl px-6 py-20 text-center sm:py-28 lg:px-10">
            <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-bold text-purple-700">
              <Icon className="h-4 w-4" aria-hidden="true" />
              {eyebrow}
            </div>

            <h1 className="mt-8 text-5xl font-black tracking-tight sm:text-6xl">
              {title}
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-xl leading-9 text-gray-600">
              {description}
            </p>

            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
              Last updated: {lastUpdated}
            </p>
          </div>
        </section>

        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-6 lg:px-10">
            <article className="space-y-14 rounded-3xl border border-gray-200 bg-white p-7 shadow-sm sm:p-10 lg:p-14">
              {children}
            </article>

            <div className="mt-10 rounded-3xl border border-purple-200 bg-purple-50 p-7 text-center sm:p-9">
              <h2 className="text-2xl font-black text-gray-950">
                Have a question?
              </h2>
              <p className="mx-auto mt-3 max-w-2xl leading-7 text-gray-600">
                Contact GetBloomDirect and we will help clarify how these
                policies apply to your account or use of the platform.
              </p>
              <Link
                href="/contact"
                className="mt-6 inline-flex rounded-2xl bg-purple-600 px-6 py-3 font-bold text-white transition hover:bg-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
              >
                Contact GetBloomDirect
              </Link>
            </div>
          </div>
        </section>
      </main>

      <HomeFooter />
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">
        {title}
      </h2>
      <div className="mt-5 space-y-4 leading-8 text-gray-600">{children}</div>
    </section>
  );
}

export function LegalList({ children }: { children: ReactNode }) {
  return (
    <ul className="ml-5 list-disc space-y-2 marker:text-purple-600">
      {children}
    </ul>
  );
}
