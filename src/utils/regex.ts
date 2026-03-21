export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function escapeReplacement(str: string): string {
  return str.replace(/\$/g, '$$$$');
}
