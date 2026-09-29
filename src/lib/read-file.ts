import { File } from 'expo-file-system';

/** Reads a picked file (file:// or content:// uri) into memory for upload. */
export function readFileAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  return new File(uri).arrayBuffer();
}
