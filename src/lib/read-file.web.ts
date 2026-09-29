/** expo-file-system has no web build; picker uris on web are blob:/data: URLs. */
export async function readFileAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  return response.arrayBuffer();
}
