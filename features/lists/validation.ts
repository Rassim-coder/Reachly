export const MAX_LIST_NAME_LENGTH = 80;

export type CleanListNameResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

/** Trims, collapses inner whitespace, and bounds a user-entered list name. */
export function validateListName(input: unknown): CleanListNameResult {
  if (typeof input !== "string") {
    return { ok: false, message: "Enter a list name." };
  }

  const cleaned = input.trim().replace(/\s+/g, " ");

  if (cleaned === "") {
    return { ok: false, message: "Enter a list name." };
  }

  if (cleaned.length > MAX_LIST_NAME_LENGTH) {
    return {
      ok: false,
      message: `List names cannot be longer than ${MAX_LIST_NAME_LENGTH} characters.`,
    };
  }

  return { ok: true, value: cleaned };
}

export function isValidListId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}