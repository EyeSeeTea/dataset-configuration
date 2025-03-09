import { NamedCodeRef } from "$/domain/entities/Ref";

export type Region = NamedCodeRef;

/**
 * Extracts the first two characters of a string and convert it to uppercase.
 * If the input string is empty, returns an empty string.
 *
 * Example:
 * Input: "us123"
 * Output: "US"
 *
 */

export function extractRegionCode(value: string): string {
    return (value?.slice(0, 2) || "").toUpperCase();
}
