import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--oz-primary)] text-[var(--oz-on-dark)] hover:bg-[var(--oz-primary-hover)]",
        outline:
          "border border-[var(--oz-primary)] bg-[var(--oz-surface)] text-[var(--oz-primary)] hover:bg-[var(--oz-outline-hover)]",
        ghost: "bg-transparent text-foreground hover:bg-surface-muted",
        destructive:
          "bg-[var(--oz-destructive)] text-[var(--oz-on-dark)] hover:bg-[var(--oz-destructive-hover)]",
      },
      size: {
        default: "min-h-11 px-5 py-3 text-sm",
        sm: "min-h-11 px-4 py-2 text-xs",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
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
  size,
  variant,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      data-slot="button"
      className={cn(buttonVariants({ className, size, variant }))}
      {...props}
    />
  );
}
