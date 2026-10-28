import type { TemplateMutationResult } from "../actions";

export function TemplateFeedback({
  result,
}: {
  result: Pick<TemplateMutationResult, "ok" | "message"> | null;
}) {
  if (!result) return null;

  return (
    <p
      role={result.ok ? "status" : "alert"}
      className={`mt-2 text-[12px] ${result.ok ? "text-muted" : "text-red-400"}`}
    >
      {result.message}
    </p>
  );
}