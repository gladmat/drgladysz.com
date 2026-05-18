// Shared shell for every operation-note template.
//
// Layout: form left, live-rendered Markdown output right (sticky on desktop
// ≥1024px). Stacks on mobile with the output below the form.
//
// State boundary: the shell holds ONLY ephemeral UI state (copy feedback,
// copy-fallback flag). Form state lives in the template component via
// useState — the shell receives a renderMarkdown() closure that's called
// on every render to produce the current output. The closure is recreated
// on each template render; that's fine, identity isn't a perf concern at
// this scale.
//
// CSP-friendly: no inline `<script>`. JSX `onClick={…}` compiles to a
// listener attached at hydration in the island bundle, served same-origin
// (script-src 'self' permits it).
//
// No localStorage. Reload = reset. Per the section's privacy contract.

import { useState, useCallback } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import './operation-notes.css';

interface Props {
  /** Pure renderer that returns the current Markdown. Called on every render. */
  renderMarkdown: () => string;
  /** Form JSX, built using shared .opnote-* CSS classes and native HTML. */
  children: ComponentChildren;
  /** Reset the form to its initial state. Owned by the template. */
  onReset: () => void;
  /** Filename hint (without extension) for the Download .md button. */
  downloadName?: string;
  /** Optional title above the form column. */
  formTitle?: string;
}

const COPY_FEEDBACK_MS = 1500;

export default function OperationNoteShell({
  renderMarkdown,
  children,
  onReset,
  downloadName = 'operation-note',
  formTitle = 'Form',
}: Props) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'fallback'>(
    'idle',
  );

  const markdown = renderMarkdown();

  const handleCopy = useCallback(async () => {
    if (!navigator.clipboard || !window.isSecureContext) {
      setCopyState('fallback');
      return;
    }
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), COPY_FEEDBACK_MS);
    } catch {
      setCopyState('fallback');
    }
  }, [markdown]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${downloadName}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [markdown, downloadName]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const copyLabel =
    copyState === 'copied'
      ? 'Copied ✓'
      : copyState === 'fallback'
        ? 'Copy failed'
        : 'Copy';

  return (
    <div class="opnote-shell">
      <div class="opnote-layout">
        <form
          class="opnote-form"
          onSubmit={(e) => e.preventDefault()}
          aria-label="Operation note inputs"
        >
          <p class="opnote-form-title">{formTitle}</p>
          {children}
          <div class="opnote-form-footer">
            <button type="button" class="opnote-reset" onClick={onReset}>
              Reset form
            </button>
          </div>
        </form>

        <section class="opnote-output" aria-label="Generated operation note">
          <div class="opnote-output-header">
            <p class="opnote-output-title">Generated note</p>
            <div class="opnote-output-actions">
              <button
                type="button"
                class="opnote-action opnote-action--primary"
                onClick={handleCopy}
                aria-live="polite"
              >
                {copyLabel}
              </button>
              <button
                type="button"
                class="opnote-action"
                onClick={handleDownload}
              >
                Download .md
              </button>
              <button
                type="button"
                class="opnote-action"
                onClick={handlePrint}
              >
                Print
              </button>
            </div>
          </div>

          <div class="opnote-output-body">
            <pre>{markdown}</pre>
          </div>

          {copyState === 'fallback' && (
            <p class="opnote-copy-fallback">
              Clipboard blocked. Select the text above and press Cmd/Ctrl+C to copy.
            </p>
          )}

          <p class="opnote-output-footer">
            Verify before pasting · No data stored · You are the author
          </p>
        </section>
      </div>
    </div>
  );
}
