// src/lib/homeFaqs.ts
export type HomeFaq = {
  question: string;
  answer: string;
};

export const homeFaqs: HomeFaq[] = [
  {
    question: "What is GetBloomDirect?",
    answer:
      "GetBloomDirect is a fee-free florist-to-florist order network that helps independent flower shops send and receive orders directly.",
  },
  {
    question: "Is GetBloomDirect really free?",
    answer:
      "Yes. Bloom Free allows florists to receive unlimited orders and send up to 15 orders per month. Bloom Pro adds unlimited sending and additional tools for growing shops.",
  },
  {
    question: "How does GetBloomDirect make money?",
    answer:
      "GetBloomDirect offers an optional Bloom Pro subscription with advanced features such as unlimited sending, expanded fulfillment offerings, reporting, Favorite Florists, priority search placement, and POS API access.",
  },
  {
    question: "Do florists pay commissions on orders?",
    answer:
      "No. GetBloomDirect does not take a commission from florist-to-florist orders. The sending and fulfilling florists work directly with one another.",
  },
  {
    question: "How are florists paid?",
    answer:
      "Florists arrange payment directly using the payment methods listed on the fulfilling shop's profile, such as Venmo, PayPal, Zelle, Cash App, or another agreed payment method.",
  },
  {
    question: "Who can join GetBloomDirect?",
    answer:
      "GetBloomDirect is built for real retail florists and independent flower shops that send or fulfill florist-to-florist orders.",
  },
  {
    question: "Can I use GetBloomDirect with my point-of-sale system?",
    answer:
      "Bloom Pro includes access to the GetBloomDirect POS API, which allows supported point-of-sale systems to retrieve and manage incoming florist orders.",
  },
];