import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZE_CLASS: Record<"sm" | "md" | "lg", string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export function ReviewStars({
  value,
  size = "md",
  className,
}: {
  /** 0..5; supports half stars at .5 increments by rounding to nearest integer */
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const filled = Math.round(Math.max(0, Math.min(5, value)));
  return (
    <span
      role="img"
      aria-label={`${value} out of 5 stars`}
      className={cn("inline-flex items-center gap-0.5", className)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            SIZE_CLASS[size],
            n <= filled
              ? "fill-[var(--color-accent)] stroke-[var(--color-accent)]"
              : "stroke-[var(--color-border-dark)]",
          )}
        />
      ))}
    </span>
  );
}
