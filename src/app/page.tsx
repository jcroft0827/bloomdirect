// src/app/page.tsx
import HomeCTA from "@/components/HomeCTA";
import HomeFAQ from "@/components/HomeFAQ";
import HomeFeatures from "@/components/HomeFeatures";
import HomeFooter from "@/components/HomeFooter";
import HomeHeader from "@/components/HomeHeader";
import HomeHero from "@/components/HomeHero";
import HomePricing from "@/components/HomePricing";
import HomeWhySwitch from "@/components/HomeWhySwitch";
import HowItWorks from "@/components/HowItWorks";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative overflow-hidden bg-white">
        <HomeHeader />
        <HomeHero />
      </section>

      <HowItWorks />
      <HomeWhySwitch />
      <HomeFeatures />
      <HomePricing />
      <HomeFAQ />
      <HomeCTA />
      <HomeFooter />
    </div>
  );
}
