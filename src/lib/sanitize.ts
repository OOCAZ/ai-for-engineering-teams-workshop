/**
 * sanitize.ts
 *
 * Input sanitization helpers for the Customer Intelligence Dashboard.
 * Strips HTML tags and limits string length to prevent XSS and oversized data
 * from reaching the UI or export system.
 */

/** Maximum length for sanitized strings (characters). */
const DEFAULT_MAX_LENGTH = 500;

/**
 * Strips HTML tags from a string and trims whitespace.
 * Also removes common script injection patterns.
 */
export function stripHtml(input: string): string {
  // Remove script/style blocks with content
  let result = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  result = result.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  // Remove all remaining HTML tags
  result = result.replace(/<[^>]*>/g, '');
  // Decode common HTML entities to their text equivalents
  result = result
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
  return result.trim();
}

/**
 * Sanitizes a user-provided string by stripping HTML and limiting length.
 * Safe to render in the UI or include in an export.
 *
 * @param input     - Raw user-provided string.
 * @param maxLength - Maximum allowed character count (default 500).
 * @returns Sanitized, length-capped string.
 */
export function sanitizeString(
  input: string,
  maxLength: number = DEFAULT_MAX_LENGTH,
): string {
  const stripped = stripHtml(input);
  return stripped.length > maxLength ? stripped.slice(0, maxLength) : stripped;
}

/**
 * Sanitizes all string values in a plain record.
 * Non-string values are passed through unchanged.
 *
 * @param record    - Object whose string fields need sanitization.
 * @param maxLength - Max length per field (default 500).
 */
export function sanitizeRecord(
  record: Record<string, string | number | boolean | null>,
  maxLength: number = DEFAULT_MAX_LENGTH,
): Record<string, string | number | boolean | null> {
  const result: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(record)) {
    result[key] =
      typeof value === 'string' ? sanitizeString(value, maxLength) : value;
  }
  return result;
}
