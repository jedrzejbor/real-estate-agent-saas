/** Keep account identity comparisons consistent across auth entry points. */
export function normalizeAccountEmail(email: string): string {
  return email.trim().toLowerCase();
}
