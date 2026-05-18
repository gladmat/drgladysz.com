// Markdown-emission helpers for operation-note templates.
//
// Each template's renderMarkdown(state) is a top-to-bottom joinSections(...)
// call. ifSection collapses optional blocks cleanly; bullets emits a
// hyphen-list with falsy items dropped.

export function joinSections(
  ...sections: (string | false | null | undefined)[]
): string {
  return sections
    .filter((s): s is string => Boolean(s && s.trim()))
    .join('\n\n');
}

export function bullets(
  items: (string | false | null | undefined)[],
  indent = '',
): string {
  return items
    .filter((s): s is string => Boolean(s && s.trim()))
    .map((s) => `${indent}- ${s}`)
    .join('\n');
}

export function numbered(
  items: (string | false | null | undefined)[],
): string {
  const filtered = items.filter((s): s is string => Boolean(s && s.trim()));
  return filtered.map((s, i) => `${i + 1}. ${s}`).join('\n');
}

export function ifSection(
  guard: unknown,
  content: string | (() => string),
): string {
  if (!guard) return '';
  return typeof content === 'function' ? content() : content;
}
