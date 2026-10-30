import Link from "next/link";

import { GET_STARTED_HREF } from "../content";
import { MarketingReveal } from "./marketing-reveal";

export function MarketingCta() {
  return (
    <section className="px-5 pb-16 md:px-8 md:pb-24">
      <MarketingReveal>
        <div className="mx-auto max-w-[1120px] rounded-[28px] bg-[#eeeafe] px-6 py-14 text-center md:px-16 md:py-[72px]">
          <h2 className="mx-auto max-w-[640px] text-[32px] leading-[1.15] font-bold tracking-[-0.03em] text-[#111827] md:text-[40px]">
            Turn your prospecting into a repeatable process.
          </h2>
          <Link
            href={GET_STARTED_HREF}
            className="rl-m-btn-primary mt-8 inline-flex"
          >
            Get started
          </Link>
        </div>
      </MarketingReveal>
    </section>
  );
}
