import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/** Writes a CSV to the cache folder and opens the share sheet (Files, Mail, WhatsApp, …). */
export async function shareCsv(fileName: string, csv: string) {
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(csv);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: fileName,
  });
}

/** Renders the HTML report to a PDF and opens the share sheet. */
export async function sharePdf(fileName: string, html: string) {
  const { uri } = await Print.printToFileAsync({ html });
  const target = new File(Paths.cache, fileName);
  target.create({ overwrite: true });
  new File(uri).copy(target);
  await Sharing.shareAsync(target.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: fileName,
  });
}
