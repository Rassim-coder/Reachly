import Image from "next/image";
import Link from "next/link";

import { APP_NAME } from "@/lib/constants";

import { GET_STARTED_HREF, NAV_LINKS, SIGN_IN_HREF } from "../content";

export function MarketingFooter() {
  return (
    <footer className="border-t border-[#e8eaf0] px-5 py-10 md:px-8">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/reachly-logo-mark.png"
              alt=""
              width={477}
              height={571}
              className="h-7 w-auto"
            />
            <span className="text-[16px] font-semibold text-[#6d3ff0]">
              {APP_NAME}
            </span>
          </Link>
          <p className="mt-3 max-w-xs text-[13px] leading-5 text-[#9ca3af]">
            Find local businesses. Reach out. Follow up.
          </p>
        </div>

        <nav
          className="flex flex-wrap gap-x-6 gap-y-3 text-[13px] font-medium text-[#6b7280]"
          aria-label="Footer"
        >
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-[#111827]">
              {link.label}
            </a>
          ))}
          <Link href={SIGN_IN_HREF} className="hover:text-[#111827]">
            Sign in
          </Link>
          <Link href={GET_STARTED_HREF} className="hover:text-[#111827]">
            Get started
          </Link>
        </nav>
      </div>
      <p className="mx-auto mt-10 max-w-[1120px] text-[12px] text-[#9ca3af]">
        © 2026 {APP_NAME}. All rights reserved.
      </p>
    </footer>
  );
}
