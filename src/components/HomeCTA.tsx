import Link from "next/link";

export default function HomeCTA() {
  return (
    <section className="bg-purple-600 py-20 text-center text-white">
      <h2 className="text-4xl font-black">
        Ready to Change the Way You Send Orders?
      </h2>

      <p className="mx-auto mt-4 max-w-xl text-lg text-purple-100">
        Join the growing network of independent florists building a better way to work together-directly and without traditional wire-service commissions.
      </p>

      <Link
        href="/register"
        className="mt-8 inline-block rounded-2xl bg-white px-10 py-4 text-lg font-bold text-purple-600 shadow-xl hover:bg-gray-100"
      >
        Join Free
      </Link>
    </section>
  );
}