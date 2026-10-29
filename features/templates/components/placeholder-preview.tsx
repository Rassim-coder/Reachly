import { splitTemplate, type PlaceholderValues } from "../placeholders";

/**
 * Renders template text with placeholders highlighted. Content is rendered as
 * React text nodes only, so template contents can never inject markup.
 */
export function PlaceholderPreview({
  text,
  values,
}: {
  text: string;
  values?: PlaceholderValues;
}) {
  return (
    <p className="text-[13px] leading-relaxed break-words whitespace-pre-wrap text-foreground">
      {splitTemplate(text, values).map((segment, index) => {
        switch (segment.type) {
          case "text":
            return <span key={index}>{segment.text}</span>;
          case "resolved":
            return (
              <span key={index} className="font-semibold">
                {segment.text}
              </span>
            );
          case "missing":
            return (
              <span
                key={index}
                title="Not available. Edit before sending."
                className="rounded-md border border-amber-500/40 bg-amber-500/10 px-1 font-mono text-[12px] text-amber-200"
              >
                {segment.token}
              </span>
            );
          default:
            return (
              <span
                key={index}
                title="Unsupported placeholder"
                className="rounded-md border border-red-500/40 bg-red-500/10 px-1 font-mono text-[12px] text-red-300"
              >
                {segment.token}
              </span>
            );
        }
      })}
    </p>
  );
}