/** Builds a `%term%` pattern with LIKE wildcards in user input escaped. */
export function containsPattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}
