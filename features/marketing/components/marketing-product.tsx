import { PRODUCT_SHOTS } from "../content";
import { MarketingReveal } from "./marketing-reveal";
import { MarketingScreenshot } from "./marketing-screenshot";

export function MarketingProduct() {
  return (
    <section id="product" className="scroll-mt-24 px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1120px]">
        <MarketingReveal>
          <p className="text-center text-[11px] font-semibold tracking-[0.16em] text-[#6d3ff0] uppercase">
            Product
          </p>
          <h2 className="mx-auto mt-3 max-w-[560px] text-center text-[32px] leading-[1.15] font-bold tracking-[-0.03em] text-[#111827] md:text-[40px]">
            Everything you need to stay organized.
          </h2>
        </MarketingReveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 md:mt-16 md:gap-6">
          {PRODUCT_SHOTS.map((shot) => (
            <MarketingReveal key={shot.src}>
              <MarketingScreenshot
                src={shot.src}
                alt={shot.alt}
                width={shot.width}
                height={shot.height}
                sizes="(min-width: 1024px) 540px, 100vw"
              />
            </MarketingReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
