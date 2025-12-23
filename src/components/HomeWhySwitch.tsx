import { XCircle, CheckCircle, X } from "lucide-react";

const reasons = [
    {
        old: "High commissions and hidden fees",
        new: "No commissions. Ever.",
    },
    {
        old: "Orders controlled by third parties",
        new: "Florists choose who they work with",
    },
    {
        old: "Quality complaints you can't control",
        new: "Trusted florist-to-florist network",
    },
    {
        old: "Outdated systems and phone calls",
        new: "Instant, modern order sending",
    },
];

export default function HomeWhySwitch() {
    return (
        <section id="why-switch" className="bg-white py-24">
            <div className="mx-auto max-w-6xl px-6">
                <h2 className="text-center text-4xl font-black text-gray-900">Why Florists Are <span className="text-purple-600">Switching</span></h2>

                <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-gray-600">
                    Florists are done losing money and control to outdated wire services.
                </p>

                <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">
                    {reasons.map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-6 rounded-3xl bg-gray-50 p-8"
                        >
                            {/* Old way */}
                            <div className="flex-1">
                                <div className="mb-2 flex items-center gap-2 text-red-500">
                                    <XCircle className="h-5 w-5" />
                                    <span className="font-semibold">Old Way</span>
                                </div>
                                <p className="text-gray-700">{item.old}</p>
                            </div>

                            {/* New Way */}
                            <div className="flex-1">
                                <div className="mb-2 flex items-center gap-2 text-emerald-700">
                                    <CheckCircle className="h-5 w-5" />
                                    <span className="font-semibold">Get Bloom Direct</span>
                                </div>
                                <p className="font-semibold text-gray-700">{item.new}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-16 text-center">
                    <p className="text-lg font-semibold text-gray-700">
                        Built by florists. Owned by florists. No middleman.
                    </p>
                </div>
            </div>
        </section>
    );
}