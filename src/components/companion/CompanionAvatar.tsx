import type { Companion } from "@/types";

export function CompanionAvatar({
  companion,
  size = 40,
  active = false,
}: {
  companion: Companion;
  size?: number;
  active?: boolean;
}) {
  const hue = companion.appearance.hue;
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-full font-display font-medium"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        color: `hsl(${hue} 70% 88%)`,
        background: `radial-gradient(120% 120% at 30% 20%, hsl(${hue} 55% 34%), hsl(${hue + 30} 40% 16%))`,
        boxShadow: active
          ? `0 0 0 1px hsl(${hue} 60% 55% / 0.55), 0 0 22px -4px hsl(${hue} 70% 55% / 0.5)`
          : `0 0 0 1px hsl(${hue} 30% 40% / 0.35)`,
      }}
    >
      {companion.avatarInitials}
    </span>
  );
}
