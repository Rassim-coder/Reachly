import { STEPS } from "../content";
import { MarketingReveal } from "./marketing-reveal";

export function MarketingProcess() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 bg-[#f7f8fb] px-5 py-16 md:px-8 md:py-24"
    >
      <div className="mx-auto max-w-[1120px]">
        <MarketingReveal>
          <h2 className="mx-auto max-w-[560px] text-center text-[32px] leading-[1.15] font-bold tracking-[-0.03em] text-[#111827] md:text-[40px]">
            A simple process. A clearer pipeline.
          </h2>
        </MarketingReveal>

        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {STEPS.map((step) => (
            <MarketingReveal key={step.n}>
              <article>
                <p className="text-[13px] font-semibold tracking-[0.08em] text-[#6d3ff0]">
                  {step.n}
                </p>
                <h3 className="mt-3 text-[18px] font-semibold tracking-tight text-[#111827]">
                  {step.title}
                </h3>
                <p className="mt-2 text-[14px] leading-6 text-[#6b7280]">
                  {step.body}
                </p>
              </article>
            </MarketingReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
