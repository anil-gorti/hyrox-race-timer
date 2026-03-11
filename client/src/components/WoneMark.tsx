import { cn } from "@/lib/utils";

interface WoneMarkProps {
  className?: string;
}

export function WoneMark({ className }: WoneMarkProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 border border-white/10 backdrop-blur-sm",
        "text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-200",
        className
      )}
    >
      <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-[#CCFF00] text-[9px] font-bold text-black">
        W
      </span>
      <span className="leading-none">Wone</span>
    </div>
  );
}

