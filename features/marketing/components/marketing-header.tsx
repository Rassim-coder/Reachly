"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { MenuIcon, XIcon } from "@/components/ui/icons";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { GET_STARTED_HREF, NAV_LINKS, SIGN_IN_HREF } from "../content";

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const [elevated, setElevated] = useState(false);

  useEffect(() => {
    const onScroll = () => setElevated(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-white/80 backdrop-blur-md transition-shadow",
        elevated && "shadow-[0_1px_0_#e8eaf0]",
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-[1120px] items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label={APP_NAME}>
          <Image
            src="/reachly-logo-mark.png"
            alt=""
            width={477}
            height={571}
            className="h-8 w-auto"
            priority
          />
          <span className="text-[18px] font-semibold tracking-tight text-[#6d3ff0]">
            {APP_NAME}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[14px] font-medium text-[#6b7280] transition-colors hover:text-[#111827]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href={SIGN_IN_HREF}
            className="px-3 py-2 text-[14px] font-medium text-[#111827] transition-colors hover:text-[#6d3ff0]"
          >
            Sign in
          </Link>
          <Link href={GET_STARTED_HREF} className="rl-m-btn-primary">
            Get started
          </Link>
        </div>

        <button
          type="button"
          className="grid size-10 place-items-center rounded-full text-[#111827] lg:hidden"
          aria-expanded={open}
          aria-controls="marketing-mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <XIcon size={20} /> : <MenuIcon size={20} />}
        </button>
      </div>

      {open ? (
        <div
          id="marketing-mobile-nav"
          className="border-t border-[#e8eaf0] bg-white px-5 py-5 lg:hidden"
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-3 text-[15px] font-medium text-[#111827]"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              href={SIGN_IN_HREF}
              className="rl-m-btn-secondary w-full justify-center"
              onClick={() => setOpen(false)}
            >
              Sign in
            </Link>
            <Link
              href={GET_STARTED_HREF}
              className="rl-m-btn-primary w-full justify-center"
              onClick={() => setOpen(false)}
            >
              Get started
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
