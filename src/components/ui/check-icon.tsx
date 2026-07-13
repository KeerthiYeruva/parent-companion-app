import { Check } from "lucide-react";

export function CheckIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return <Check aria-hidden="true" className={className} strokeWidth={2.5} />;
}
