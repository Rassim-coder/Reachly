import Link from "next/link";

import { PlayIcon } from "@/components/ui/icons";

import { GET_STARTED_HREF } from "../content";
import { MarketingReveal } from "./marketing-reveal";
import { MarketingScreenshot } from "./marketing-screenshot";

export function MarketingHero() {
  return (
    <section className="relative overflow-hidden px-5 pt-10 pb-6 md:px-8 md:pt-16 md:pb-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(109,63,240,0.10),transparent_62%)]"
      />
      <div className="relative mx-auto max-w-[1120px] text-center">
        <MarketingReveal>
          <h1 className="mx-auto max-w-[720px] text-[40px] leading-[1.08] font-bold tracking-[-0.03em] text-[#111827] md:text-[56px]">
            Find your next{" "}
            <span className="text-[#6d3ff0]">customers.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[540px] text-[16px] leading-7 text-[#6b7280] md:text-[17px]">
            Search local businesses, save the ones worth contacting, and keep
            every follow-up in one place.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={GET_STARTED_HREF} className="rl-m-btn-primary min-w-[148px]">
              Get started
            </Link>
            <a href="#product" className="rl-m-btn-secondary min-w-[148px]">
              <PlayIcon size={14} />
              Watch demo
            </a>
          </div>
        </MarketingReveal>

        <MarketingReveal className="mt-12 md:mt-16">
          <MarketingScreenshot
            src="/images/overview-page.png"
            alt="Reachly Overview dashboard"
            width={1886}
            height={908}
            priority
            glow
            sizes="(min-width: 1120px) 1120px, 100vw"
          />
        </MarketingReveal>
      </div>
    </section>
  );
}
