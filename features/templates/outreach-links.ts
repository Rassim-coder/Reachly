/**
 * Pure helpers that build `wa.me` and `mailto:` links so the user can send a
 * personalized message from their OWN WhatsApp or email app. Reachly never
 * sends anything: the link only opens the app with the text prefilled.
 */

/**
 * Country code used to turn a local number that starts with 0 (for example
 * `0550 12 34 56`) into an international one. Change it if your leads are
 * mostly in another country.
 */
export const DEFAULT_PHONE_COUNTRY_CODE = "213";

/** Very long links are rejected by browsers and mail apps. */
const MAX_LINK_LENGTH = 1900;

export type OutreachLink =
  | { url: string; problem: null }
  | { url: null; problem: string };

/**
 * Returns the number in the digits-only international format `wa.me` expects,
 * or null when it cannot be determined with confidence.
 */
export function toWhatsAppNumber(
  phone: string | null | undefined,
  countryCode: string = DEFAULT_PHONE_COUNTRY_CODE,
): string | null {
  if (typeof phone !== "string") return null;

  const raw = phone.trim();
  if (raw === "") return null;

  let digits = raw.replace(/\D/g, "");
  if (digits === "") return null;

  if (raw.startsWith("+")) {
    // Already international.
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = countryCode + digits.slice(1);
  } else if (digits.startsWith(countryCode) && digits.length >= 11) {
    // Written without the "+", but clearly starts with the country code.
  } else {
    return null;
  }

  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export function isPlausibleEmail(value: string | null | undefined): boolean {
  return (
    typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  );
}

export function buildWhatsAppLink(
  phone: string | null | undefined,
  message: string,
): OutreachLink {
  if (typeof phone !== "string" || phone.trim() === "") {
    return { url: null, problem: "This lead has no phone number." };
  }

  const number = toWhatsAppNumber(phone);

  if (!number) {
    return {
      url: null,
      problem: "The phone number format is not recognized for WhatsApp.",
    };
  }

  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

  return url.length > MAX_LINK_LENGTH
    ? { url: null, problem: "The message is too long to prefill. Copy it instead." }
    : { url, problem: null };
}

export function buildMailtoLink(
  email: string | null | undefined,
  subject: string,
  message: string,
): OutreachLink {
  if (typeof email !== "string" || email.trim() === "") {
    return { url: null, problem: "This lead has no email address." };
  }

  if (!isPlausibleEmail(email)) {
    return { url: null, problem: "The email address looks invalid." };
  }

  const to = encodeURIComponent(email.trim()).replace(/%40/g, "@");
  // Mail apps expect CRLF line breaks in the prefilled body.
  const body = encodeURIComponent(message.replace(/\r?\n/g, "\r\n"));
  const url = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${body}`;

  return url.length > MAX_LINK_LENGTH
    ? { url: null, problem: "The message is too long to prefill. Copy it instead." }
    : { url, problem: null };
}