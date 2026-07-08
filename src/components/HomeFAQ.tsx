const faqs = [
  {
    q: "Is this a wire service?",
    a: "No. GetBloomDirect is a direct florist-to-florist network built to help independent shops send and receive orders without wire-service commissions.",
  },
  {
    q: "Do you take a percentage of orders?",
    a: "No. GetBloomDirect does not take a percentage of orders. Florists keep 100% of the order value they agree on.",
  },
  {
    q: "Can I choose who I work with?",
    a: "Yes. You choose which florist receives your order, and you can review shops before sending.",
  },
  {
    q: "What is included with Bloom Free?",
    a: "Bloom Free includes 20 sent orders per month, unlimited received orders, a public profile, reviews, messaging, basic notifications, and two fulfillment offerings.",
  },
  {
    q: "What is Bloom Pro?",
    a: "Bloom Pro is the upcoming paid plan for shops that want unlimited sending, more fulfillment offerings, reporting, POS API access, priority support, and additional visibility.",
  },
  {
    q: "Is there a contract?",
    a: "No long-term contracts. Bloom Free is free to use, and Bloom Pro will be available monthly or yearly.",
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
            <div key={i} className="rounded-2xl bg-gray-50 p-6" suppressHydrationWarning>
              <h3 className="text-lg font-bold text-gray-900">{faq.q}</h3>
              <p className="mt-2 text-gray-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}