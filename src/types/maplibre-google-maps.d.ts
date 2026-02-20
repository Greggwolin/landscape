declare module 'maplibre-google-maps' {
  export function googleProtocol(
    params: { url: string },
    abortController?: AbortController
  ): Promise<{ data: ArrayBuffer }>;

  export function createGoogleStyle(
    id: string,
    mapType: string,
    key: string
  ): Record<string, unknown>;
}
