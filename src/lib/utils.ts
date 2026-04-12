import { type ClassValue, clsx } from "clsx";

/**
 * Merge class names with clsx.
 * Combines conditional classes into a single string.
 *
 * If you install `tailwind-merge`, you can enhance this to:
 *   import { twMerge } from "tailwind-merge";
 *   return twMerge(clsx(inputs));
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * Format a number as Peruvian Soles (S/).
 *
 * @example
 * formatCurrency(1500)    // "S/ 1,500.00"
 * formatCurrency(49.9)    // "S/ 49.90"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Smart worker name display.
 *
 * Handles cases where PLAME imports store the full name in both
 * firstName and lastName fields. Deduplicates and formats cleanly.
 *
 * @example
 * displayWorkerName("MARIA", "GARCIA LOPEZ")         // "GARCIA LOPEZ, MARIA"
 * displayWorkerName("GARCIA LOPEZ MARIA", "GARCIA LOPEZ MARIA") // "GARCIA LOPEZ MARIA"
 * displayWorkerName(null, "GARCIA")                    // "GARCIA"
 */
export function displayWorkerName(
  firstName: string | null,
  lastName: string | null,
): string {
  const f = (firstName ?? "").trim();
  const l = (lastName ?? "").trim();
  if (!f && !l) return "—";
  if (!f) return l;
  if (!l) return f;
  // Both fields contain the same value → show once
  if (f === l) return l;
  // One field contains the other → show the longer one
  if (l.includes(f) || f.includes(l))
    return l.length >= f.length ? l : f;
  // Normal case: "Apellidos, Nombres"
  return `${l}, ${f}`;
}

/**
 * Extract initials from worker name (2 letters).
 */
export function workerInitials(
  firstName: string | null,
  lastName: string | null,
): string {
  const name = displayWorkerName(firstName, lastName);
  if (!name || name === "—") return "?";
  const parts = name
    .replace(/,/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 1) return (parts[0]?.[0] ?? "?").toUpperCase();
  return (
    (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")
  ).toUpperCase();
}

/**
 * Format a date for the es-PE locale.
 * Accepts a Date object or an ISO date string.
 *
 * @example
 * formatDate(new Date())          // "01 abr. 2026"
 * formatDate("2026-04-01")        // "01 abr. 2026"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}
