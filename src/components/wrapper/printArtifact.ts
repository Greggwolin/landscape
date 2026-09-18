/**
 * Printing an artifact — the paper copy, and the PDF, from the panel itself.
 *
 * Gregg, 2026-09-17: "there is no printed version accessible from the UI."
 * True of the artifact: it offered copy and nothing else, and the only printed
 * version in the application lived on the Reports screen, which is a different
 * screen holding different things. This gives the artifact its own.
 *
 * It prints the artifact ALONE, not the page around it: the content is written
 * into a hidden frame of its own and printed from there, so no panel chrome, no
 * sidebar and no chat come with it. A hidden frame rather than a second window
 * because a window is what a popup blocker stops.
 *
 * The sheet is LIGHT, always — explicit white paper and black text, no
 * dark-mode variant and nothing inherited from the screen's theme. The working
 * surface is dark; paper is not, and a dark artifact sent to a printer either
 * floods the page or drops out entirely.
 */

/** The complete document that goes to the printer. Pure — tested directly. */
export function buildPrintDocument(title: string, bodyHtml: string,
                                   footNote?: string): string {
  const safeTitle = (title || 'Artifact')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const note = footNote
    ? `<footer>${footNote.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</footer>`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<style>
  @page { margin: 14mm; }
  html, body { background: #ffffff; color: #111111; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.35;
  }
  h1 { font-size: 15pt; margin: 0 0 10pt; }
  h3, h4 { font-size: 11.5pt; margin: 12pt 0 4pt; }
  table { border-collapse: collapse; width: 100%; font-size: 10pt; }
  /* A heading never splits from the rows it names, and a row never splits
     across a page break. */
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th { border-bottom: 0.7pt solid #111111; padding: 3pt 6pt; font-weight: 700; }
  td { padding: 2pt 6pt; }
  footer { margin-top: 14pt; font-size: 8.5pt; color: #555555; }
</style>
</head>
<body>
<h1>${safeTitle}</h1>
${bodyHtml}
${note}
</body>
</html>`;
}

/**
 * Print `bodyHtml` as its own document. Returns false when the frame could not
 * be created, so the caller can say so instead of leaving a dead button.
 */
export function printArtifact(title: string, bodyHtml: string,
                              footNote?: string): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    document.body.appendChild(frame);

    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) {
      frame.remove();
      return false;
    }
    doc.open();
    doc.write(buildPrintDocument(title, bodyHtml, footNote));
    doc.close();

    // Give the frame a tick to lay the document out; printing an unlaid-out
    // document is how a blank sheet happens.
    win.setTimeout(() => {
      win.focus();
      win.print();
      // Left in place briefly: removing the frame while the print dialog is
      // still reading it cancels the job in some browsers.
      window.setTimeout(() => frame.remove(), 1000);
    }, 60);
    return true;
  } catch {
    return false;
  }
}
