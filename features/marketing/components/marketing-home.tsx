import { MarketingCta } from "./marketing-cta";
import { MarketingFeatures } from "./marketing-features";
import { MarketingFooter } from "./marketing-footer";
import { MarketingHeader } from "./marketing-header";
import { MarketingHero } from "./marketing-hero";
import { MarketingProcess } from "./marketing-process";
import { MarketingProduct } from "./marketing-product";

export function MarketingHome() {
  return (
    <div className="rl-marketing min-h-dvh bg-white text-[#111827]">
      <MarketingHeader />
      <main>
        <MarketingHero />
        <MarketingFeatures />
        <MarketingProcess />
        <MarketingProduct />
        <MarketingCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
