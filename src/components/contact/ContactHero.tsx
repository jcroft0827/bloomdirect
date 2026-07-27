// src/components/contact/ContactHero.tsx

import {
  ArrowRight,
  Lightbulb,
  Mail,
  MessageSquareText,
  Phone,
} from "lucide-react";
import Link from "next/link";

export default function ContactHero() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-gray-200 bg-white">
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-purple-50 to-transparent" />

        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-10">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-bold text-purple-700">
              <MessageSquareText className="h-4 w-4" />
              Contact GetBloomDirect
            </div>

            <h1 className="mt-8 text-5xl font-black tracking-tight text-gray-950 sm:text-6xl lg:text-7xl">
              Let&apos;s start a conversation.
            </h1>

            <p className="mx-auto mt-8 max-w-3xl text-xl leading-9 text-gray-600">
              Have a question about GetBloomDirect, need help with your account,
              or have an idea that could make the platform more valuable for
              florists? I&apos;d love to hear from you.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-3xl">
          <article className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
              <Mail className="h-7 w-7" />
            </div>

            <h2 className="mt-7 text-3xl font-black tracking-tight text-gray-950">
              Email GetBloomDirect
            </h2>

            <p className="mt-4 text-lg leading-8 text-gray-600">
              Email is the best way to reach us for general questions, platform
              feedback, account help, partnerships, or florist suggestions.
            </p>

            <a
              href="mailto:getbloomdirect@gmail.com"
              className="mt-8 inline-flex items-center gap-2 text-lg font-bold text-purple-700 transition hover:text-purple-800"
            >
              getbloomdirect@gmail.com
              <ArrowRight className="h-5 w-5" />
            </a>
          </article>

          {/* <article className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-green-700">
              <Phone className="h-7 w-7" />
            </div>

            <h2 className="mt-7 text-3xl font-black tracking-tight text-gray-950">
              Call or text
            </h2>

            <p className="mt-4 text-lg leading-8 text-gray-600">
              Florists can also reach GetBloomDirect directly by phone for
              questions about joining, setup, or using the network.
            </p>

            <a
              href="tel:+17165660673"
              className="mt-8 inline-flex items-center gap-2 text-lg font-bold text-purple-700 transition hover:text-purple-800"
            >
              716-566-0673
              <ArrowRight className="h-5 w-5" />
            </a>
          </article> */}
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto max-w-5xl px-6 text-center lg:px-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
            <Lightbulb className="h-7 w-7" />
          </div>

          <h2 className="mt-7 text-4xl font-black tracking-tight text-gray-950 sm:text-5xl">
            Florist feedback shapes what comes next.
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-600">
            GetBloomDirect is being built through real conversations with
            independent florists. Ideas, frustrations, and suggestions help
            determine what the platform becomes.
          </p>

          <Link
            href="/vision"
            className="mt-9 inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-purple-700"
          >
            Explore Our Vision
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </>
  );
}
