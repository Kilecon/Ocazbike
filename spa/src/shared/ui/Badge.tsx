import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/cn";

const badgeColors = ["draft", "info", "warning", "error", "success"] as const;
const legacyColors = {
  default: "success",
  secondary: "draft",
  destructive: "error",
  outline: "info",
} as const;

const badgeVariants = cva(
  "oz-badge inline-flex items-center justify-center whitespace-nowrap rounded-[var(--oz-figma-tokens-sizes-radius-l)] px-4 py-1 text-[length:var(--oz-figma-tokens-sizes-sizes-text-xs)] font-medium leading-[1.3]",
);

type BadgeProps = Omit<ComponentProps<"span">, "color"> &
  VariantProps<typeof badgeVariants> & {
    color?: (typeof badgeColors)[number];
    variant?: keyof typeof legacyColors;
  };

function Badge({
  className,
  color,
  variant = "default",
  ...props
}: BadgeProps) {
  const resolvedColor = color ?? legacyColors[variant];

  return (
    <span
      data-slot="badge"
      data-color={resolvedColor}
      className={cn(badgeVariants(), `oz-badge-${resolvedColor}`, className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
