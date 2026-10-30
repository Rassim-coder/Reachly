import Image from "next/image";

import { cn } from "@/lib/utils";

export function MarketingScreenshot({
  src,
  alt,
  width,
  height,
  priority = false,
  sizes,
  className,
  glow = false,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  sizes: string;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[20px] border border-[#e8eaf0] bg-white shadow-[0_18px_50px_rgba(16,24,40,0.10)]",
        glow && "shadow-[0_28px_80px_rgba(109,63,240,0.16)]",
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        sizes={sizes}
        className="h-auto w-full"
      />
    </div>
  );
}
