const faqs = [
  {
    q: "Is this a wire service?",
    a: "No. Get Bloom Direct is owned by florists and built to replace wire services entirely.",
  },
  {
    q: "Do you take a percentage of orders?",
    a: "Never. Florists keep 100% of every order they send or receive.",
  },
  {
    q: "Can I choose who I work with?",
    a: "Yes. You decide which florists you send orders to.",
  },
  {
    q: "Is there a contract?",
    a: "No long-term contracts. Cancel anytime.",
  },
];

export default function HomeFAQ() {
  return (
    <section id="faq" className="bg-white py-24">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center text-4xl font-black text-gray-900">
          Frequently Asked Questions
        </h2>

        <div className="mt-12 space-y-8">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-2xl bg-gray-50 p-6">
              <h3 className="text-lg font-bold text-gray-900">{faq.q}</h3>
              <p className="mt-2 text-gray-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
