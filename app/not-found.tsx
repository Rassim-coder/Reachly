import Link from "next/link";

import { SendIcon } from "@/components/ui/icons";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-[13px] font-medium text-faint">404</p>
      <h1 className="text-[22px] font-bold tracking-tight">Page not found</h1>
      <p className="max-w-sm text-[13px] text-muted">
        The page you are looking for does not exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-2 flex h-8 items-center gap-1.5 rounded-full bg-[linear-gradient(90deg,#6d3ff0,#0a8fe0)] px-3.5 text-[13px] font-medium text-white shadow-[0_2px_6px_rgba(109,63,240,.3)]"
      >
        <SendIcon size={13} />
        Back to dashboard
      </Link>
    </main>
  );
}