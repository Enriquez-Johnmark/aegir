import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

/**
 * A navigation link that looks like a button. Rendering a link through the
 * Base UI Button (`render={<Link />}` + `nativeButton={false}`) adds
 * role="button", so screen readers announce a button that navigates. A real
 * <a> styled with buttonVariants keeps link semantics.
 */
export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: React.ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>) {
  return <Link data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
