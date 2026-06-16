import { cn } from "@/lib/utils";

/**
 * Company brand mark. Renders public/logo.svg - replace that one file with the
 * exact original (same name) to update the logo everywhere it appears.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src="/logo.svg"
      alt="Q Agency"
      draggable={false}
      className={cn("object-contain select-none", className)}
    />
  );
}
