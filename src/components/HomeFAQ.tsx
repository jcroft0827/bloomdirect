import { homeFaqs } from "@/lib/homeFaqs";

export default function HomeFAQ() {
  return (
    <section id="faq" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-purple-700">
            Questions before you build?
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {homeFaqs.map((faq) => (
            <article
              key={faq.question}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
            >
              <h3 className="text-base font-black leading-6 text-slate-950">
                {faq.question}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {faq.answer}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
