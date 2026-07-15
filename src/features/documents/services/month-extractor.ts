const monthPattern =
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i;

export const extractMonthLabel = (fileName: string, contentText?: string) => {
  const haystack = `${fileName} ${contentText ?? ''}`;
  const match = haystack.match(monthPattern);
  return match ? match[1][0].toUpperCase() + match[1].slice(1).toLowerCase() : undefined;
};
