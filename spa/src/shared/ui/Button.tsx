import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/cn";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--oz-figma-tokens-sizes-radius-xs)] font-medium transition-[background,border-color,box-shadow,color] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "oz-button-primary",
        primary: "oz-button-primary",
        outline: "oz-button-secondary",
        secondary: "oz-button-secondary",
        ghost: "oz-button-ghost",
        destructive: "oz-button-primary oz-button-negative",
      },
      negative: {
        true: "oz-button-negative",
      },
      size: {
        default:
          "min-h-10 px-5 py-2 text-[length:var(--oz-figma-tokens-sizes-sizes-text-xs)]",
        sm: "min-h-9 px-3 py-1.5 text-[length:var(--oz-figma-tokens-sizes-sizes-text-xss)]",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      negative: false,
      size: "default",
    },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({
  asChild = false,
  className,
  negative,
  size,
  variant,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      data-slot="button"
      className={cn(buttonVariants({ className, negative, size, variant }))}
      {...props}
    />
  );
}
