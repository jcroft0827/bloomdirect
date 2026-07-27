import { homeFaqs } from "@/lib/homeFaqs";

export default function HomeFAQ() {
  return (
    <section id="faq" className="bg-white py-24">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center text-4xl font-black text-gray-900">
          Frequently Asked Questions
        </h2>

        <div className="mt-12 space-y-8">
          {homeFaqs.map((faq) => (
            <div key={faq.question} className="rounded-2xl bg-gray-50 p-6" suppressHydrationWarning>
              <h3 className="text-lg font-bold text-gray-900">{faq.question}</h3>
              <p className="mt-2 text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}