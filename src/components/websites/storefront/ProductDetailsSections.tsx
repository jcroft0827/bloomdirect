import { Flower2, Info, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import type { BloomWebsiteStorefrontProductDetail } from "@/types/bloom-website";

type Props = {
  product: BloomWebsiteStorefrontProductDetail;
  businessName: string;
  elegant?: boolean;
  primaryColor: string;
};

export default function ProductDetailsSections({ product, businessName, elegant = false, primaryColor }: Props) {
  const occasions = Array.from(new Set(product.occasions.map((value) => value.trim()).filter(Boolean)));
  const hasDescription = Boolean(product.description?.trim());
  const hasNote = Boolean(product.arrangementContainerNote?.trim());

  return (
    <section aria-label="Arrangement details" className={elegant ? "mt-16 border-t border-stone-200 pt-12 sm:mt-20 sm:pt-16" : "mx-auto mt-16 max-w-5xl border-t border-gray-100 pt-10 sm:mt-20"}>
      <div className={elegant ? "grid gap-9 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16" : "grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:gap-12"}>
        <div>
          <p className={elegant ? "text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500" : "text-xs font-black uppercase tracking-[0.17em]"} style={elegant ? undefined : { color: primaryColor }}>The details</p>
          <h2 className={elegant ? "mt-3 font-serif text-3xl font-medium tracking-tight text-stone-950 sm:text-4xl" : "mt-3 text-2xl font-black tracking-tight text-gray-950 sm:text-3xl"}>A little more about this arrangement</h2>
        </div>
        <div className="space-y-9">
          {hasDescription && (
            <div>
              <h3 className={elegant ? "font-serif text-xl text-stone-950" : "text-lg font-bold text-gray-950"}>About the flowers</h3>
              <p className="mt-3 whitespace-pre-line text-base leading-8 text-gray-600">{product.description}</p>
            </div>
          )}
          {occasions.length > 0 && (
            <div>
              <div className="flex items-center gap-2"><Sparkles size={17} className="text-stone-500" aria-hidden="true"/><h3 className={elegant ? "font-serif text-xl text-stone-950" : "text-lg font-bold text-gray-950"}>Perfect for</h3></div>
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Suggested occasions">
                {occasions.map((occasion) => <li key={occasion} className={elegant ? "border border-stone-200 px-3 py-2 text-sm text-stone-700" : "rounded-full bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700"}>{occasion}</li>)}
              </ul>
            </div>
          )}
          {hasNote && (
            <div>
              <div className="flex items-center gap-2"><Info size={17} className="text-stone-500" aria-hidden="true"/><h3 className={elegant ? "font-serif text-xl text-stone-950" : "text-lg font-bold text-gray-950"}>Arrangement &amp; container details</h3></div>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-600">{product.arrangementContainerNote}</p>
            </div>
          )}
          {product.allowsSubstitutions && (
            <div>
              <h3 className={elegant ? "font-serif text-xl text-stone-950" : "text-lg font-bold text-gray-950"}>Seasonal flowers &amp; substitutions</h3>
              <p className="mt-3 text-sm leading-7 text-gray-600">Some flowers or materials may be substituted based on seasonal availability. The florist will use their judgment when creating your arrangement.</p>
            </div>
          )}
        </div>
      </div>
      <div className={elegant ? "mt-14 grid gap-7 border-y border-stone-200 py-9 sm:grid-cols-2 sm:gap-12" : "mt-12 grid gap-4 border-t border-gray-100 pt-8 sm:grid-cols-2"}>
        <div className={elegant ? "flex gap-4" : "flex gap-3 rounded-2xl bg-gray-50 p-5"}>
          <Flower2 size={20} className="mt-0.5 shrink-0 text-stone-600" aria-hidden="true" />
          <div><h3 className={elegant ? "font-serif text-xl text-stone-950" : "text-sm font-black text-gray-950"}>Created by your local florist</h3><p className="mt-2 text-sm leading-6 text-gray-600">Prepared by {businessName} for your order.</p></div>
        </div>
        <div className={elegant ? "flex gap-4" : "flex gap-3 rounded-2xl bg-gray-50 p-5"}>
          {product.localOnly ? <MapPin size={20} className="mt-0.5 shrink-0 text-stone-600" aria-hidden="true" /> : <ShieldCheck size={20} className="mt-0.5 shrink-0 text-stone-600" aria-hidden="true" />}
          <div><h3 className={elegant ? "font-serif text-xl text-stone-950" : "text-sm font-black text-gray-950"}>Delivery &amp; pickup</h3><p className="mt-2 text-sm leading-6 text-gray-600">{product.localOnly ? "This item is offered locally. Available fulfillment options, dates, and charges are confirmed during checkout." : "Available fulfillment options, dates, and charges are confirmed during checkout."}</p></div>
        </div>
      </div>
    </section>
  );
}
