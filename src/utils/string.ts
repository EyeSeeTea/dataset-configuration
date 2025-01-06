/**
 * Extracts the first two characters of a string and convert it to uppercase.
 * If the input string is empty, returns an empty string.
 *
 * Example:
 * Input: "us123"
 * Output: "US"
 *
 */

export function extractFirstTwoLetters(value: string): string {
    return (value.slice(0, 2) || "").toUpperCase();
}

/**
 * Extracts the portion of a code string before the first underscore ("_")
 * and converts it to uppercase.
 *
 * Example:
 * Input: "us_region"
 * Output: "US"
 *
 */
export function extractPrefix(value: string): string {
    return (value.split("_")[0] || "").toUpperCase();
}
