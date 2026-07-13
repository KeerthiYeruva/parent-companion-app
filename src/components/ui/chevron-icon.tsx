import { ChevronDown, ChevronUp } from "lucide-react";

export function ChevronIcon({
  className = "h-4 w-4",
  direction = "down",
}: {
  className?: string;
  direction?: "down" | "up";
}) {
  const Icon = direction === "up" ? ChevronUp : ChevronDown;
  return <Icon aria-hidden="true" className={className} strokeWidth={2} />;
}
