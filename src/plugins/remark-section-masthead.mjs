// src/plugins/remark-section-masthead.mjs
//
// Remark transform that recognises the brand-spec "section masthead" pattern:
//
//     § 01 — Identification
//
//     ## Imprint
//
// where a paragraph of the form `§ <digits>(<digits>)? — <Theme>` introduces
// the h2 heading immediately following. The pattern is locked content per
// `01-brand-system/legal-pages-package/_meta/README.md` §"Required render
// conventions" point 1: render in IBM Plex Mono small caps with oxblood
// accent, separate from the h2.
//
// This plugin marks matching paragraphs with `data-section-masthead` so the
// page CSS picks them up. It does NOT collapse them into the heading — they
// remain two separate elements as the convention requires.
import { visit } from 'unist-util-visit';

const PATTERN = /^§\s+\d+(?:\.\d+)?\s+[—–-]\s+/;

export default function remarkSectionMasthead() {
  return function transform(tree) {
    visit(tree, 'paragraph', (node) => {
      const first = node.children?.[0];
      if (!first || first.type !== 'text') return;
      if (!PATTERN.test(first.value)) return;

      node.data = node.data || {};
      node.data.hProperties = node.data.hProperties || {};
      const existing = node.data.hProperties.className;
      const classNames = Array.isArray(existing)
        ? [...existing, 'section-masthead']
        : existing
          ? [existing, 'section-masthead']
          : ['section-masthead'];
      node.data.hProperties.className = classNames;
    });
  };
}
