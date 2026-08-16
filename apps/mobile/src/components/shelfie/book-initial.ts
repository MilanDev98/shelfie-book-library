export function getBookInitial(title?: string | null): string {
  const trimmedTitle = title?.trim();
  return trimmedTitle ? trimmedTitle[0].toLocaleUpperCase() : '?';
}
