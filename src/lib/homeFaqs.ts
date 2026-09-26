export type HomeFaq = {
  question: string;
  answer: string;
};

export const homeFaqs: HomeFaq[] = [
  {
    question: "What is BloomWebsites?",
    answer:
      "BloomWebsites is a florist ecommerce platform inside GetBloomDirect. It helps flower shops build a public storefront with products, online ordering, delivery and pickup settings, customer payments, tax tools, order workflows, recipes, notifications, and refunds.",
  },
  {
    question: "Can I build a BloomWebsite before paying?",
    answer:
      "Yes. Florists can build and preview their BloomWebsite for free. A BloomWebsites subscription is only required when the shop is ready to publish the storefront publicly.",
  },
  {
    question: "How much does BloomWebsites cost?",
    answer:
      "BloomWebsites Standard is $129 per month or $1,349 per year. Annual billing saves $199 compared with paying monthly. Self-service setup is $0.",
  },
  {
    question: "Does Bloom charge a fee on each website order?",
    answer:
      "No. BloomWebsites does not charge a Bloom percentage or per-order fee on website sales. Normal payment-processor fees still apply when customers pay by card.",
  },
  {
    question: "Can customers choose delivery or pickup?",
    answer:
      "Yes. BloomWebsites supports florist-configured delivery and pickup settings, including delivery areas, delivery fees, same-day rules, cutoff times, blackout dates, and related fulfillment policies.",
  },
  {
    question: "How do refunds work?",
    answer:
      "BloomWebsites can refund specific products, quantities, add-ons, delivery charges, tips, tax, or a custom amount. Structured refunds use the original order and tax snapshot so later shop-setting changes do not rewrite the old order.",
  },
  {
    question: "What is GetBloomDirect?",
    answer:
      "GetBloomDirect is a florist-to-florist fulfillment network for independent flower shops. Bloom Free lets shops receive unlimited network orders and send up to 15 network orders per month without a Bloom per-order commission.",
  },
  {
    question: "How are GetBloomDirect florist-to-florist orders paid today?",
    answer:
      "Florists currently arrange settlement directly using the payment methods configured by the fulfilling shop. Integrated network payment options may be added in the future.",
  },
  {
    question: "Do I need Bloom Pro to use BloomWebsites?",
    answer:
      "No. BloomWebsites Standard is its own subscription. Bloom Pro is an optional GetBloomDirect network subscription for shops that want unlimited network sending and additional network tools.",
  },
  {
    question: "Can BloomWebsites connect to a point-of-sale system?",
    answer:
      "BloomWebsites is being designed with a separate integration layer for future POS order exports and workflow integrations. GetBloomDirect Pro already includes access to the GetBloomDirect POS API.",
  },
];
