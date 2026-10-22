// Wrapper untuk ikon Flaticon UIcons (CDN) — dilarang menggunakan emoji.
// Style "rr" = regular rounded, "sr" = solid rounded.
import { cn } from "@/lib/utils";

type IconProps = {
  name: string;
  solid?: boolean;
  className?: string;
  size?: number;
};

export function Icon({ name, solid = false, className, size }: IconProps) {
  return (
    <i
      className={cn(`fi fi-${solid ? "sr" : "rr"}-${name}`, "leading-none align-middle", className)}
      style={size ? { fontSize: size } : undefined}
      aria-hidden="true"
    />
  );
}
