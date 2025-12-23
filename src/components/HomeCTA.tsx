export default function HomeCTA() {
    return (
        <section className="bg-purple-600 py-20 text-center text-white">
            <h2 className="text-4xl font-black">
                Join the Florist-Owned Network
            </h2>
            <p className="mt-4 text-lg mx-auto max-w-xl text-purple-100">
                Stop paying wire service fees. Start sending orders directly.
            </p>

            <a href="/register" className="mt-8 inline-block rounded-2xl bg-white px-10 py-4 text-lg font-bold shadow-xl text-purple-600 hover:bg-gray-100">
                Get Started Free
            </a>
        </section>
    )
}