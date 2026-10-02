/** Browsers can't share local files, so the CSV is downloaded directly. */
export async function shareCsv(fileName: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Prints the report from a hidden iframe; the browser's print dialog offers "Save as PDF".
 * (A new window would be blocked as a pop-up because the report is built after an async load.)
 */
export async function sharePdf(fileName: string, html: string) {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0;';
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(html.replace('<title></title>', `<title>${fileName}</title>`));
  doc.close();
  await new Promise((resolve) => setTimeout(resolve, 300));
  frame.contentWindow!.focus();
  frame.contentWindow!.print();
  // Remove after the dialog closes (print() blocks in most browsers).
  setTimeout(() => frame.remove(), 1000);
}
