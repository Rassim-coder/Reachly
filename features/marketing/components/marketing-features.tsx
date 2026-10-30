import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

import { FEATURES } from "../content";
import { MarketingReveal } from "./marketing-reveal";
import { MarketingScreenshot } from "./marketing-screenshot";

export function MarketingFeatures() {
  return (
    <section id="features" className="scroll-mt-24 px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1120px]">
        <MarketingReveal>
          <h2 className="mx-auto max-w-[640px] text-center text-[32px] leading-[1.15] font-bold tracking-[-0.03em] text-[#111827] md:text-[40px]">
            From your first search to your next follow-up.
          </h2>
        </MarketingReveal>

        <div className="mt-16 flex flex-col gap-20 md:mt-24 md:gap-28">
          {FEATURES.map((feature) => (
            <MarketingReveal key={feature.id}>
              <article className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                <div className={cn(feature.imageFirst ? "lg:order-2" : "lg:order-1")}>
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-[#6d3ff0] uppercase">
                    {feature.eyebrow}
                  </p>
                  <h3 className="mt-3 max-w-[420px] text-[28px] leading-[1.15] font-bold tracking-[-0.03em] text-[#111827] md:text-[32px]">
                    {feature.title}
                  </h3>
                  <p className="mt-4 max-w-[440px] text-[16px] leading-7 text-[#6b7280]">
                    {feature.body}
                  </p>
                  {"bullets" in feature && feature.bullets ? (
                    <ul className="mt-6 flex flex-col gap-3">
                      {feature.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex items-start gap-3 text-[14px] font-medium text-[#111827]"
                        >
                          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#eeeafe] text-[#6d3ff0]">
                            <CheckIcon size={12} />
                          </span>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div className={cn(feature.imageFirst ? "lg:order-1" : "lg:order-2")}>
                  <MarketingScreenshot
                    src={feature.image.src}
                    alt={feature.image.alt}
                    width={feature.image.width}
                    height={feature.image.height}
                    sizes="(min-width: 1024px) 520px, 100vw"
                  />
                </div>
              </article>
            </MarketingReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
