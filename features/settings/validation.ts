export const MAX_PROFILE_NAME_LENGTH = 100;

export type ProfileNameResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

export function validateProfileName(input: unknown): ProfileNameResult {
  if (typeof input !== "string") {
    return { ok: false, message: "Enter your name." };
  }

  const value = input.trim().replace(/\s+/g, " ");
  if (value === "") return { ok: false, message: "Enter your name." };
  if (value.length > MAX_PROFILE_NAME_LENGTH) {
    return {
      ok: false,
      message: `Name must be ${MAX_PROFILE_NAME_LENGTH} characters or fewer.`,
    };
  }

  return { ok: true, value };
}
