export function ChevronIcon({
  className = "h-4 w-4",
  direction = "down",
}: {
  className?: string;
  direction?: "down" | "up";
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className={className}
    >
      <path
        d={direction === "up" ? "M5 12.5 10 7.5l5 5" : "M5 7.5l5 5 5-5"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
