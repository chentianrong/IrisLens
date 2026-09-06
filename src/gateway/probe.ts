export type ProbeResult =
  | { category: 'available'; status?: number }
  | { category: 'authentication'; status: number; summary: string }
  | { category: 'network'; summary: string }
  | { category: 'unavailable-model'; status: number; summary: string }
  | { category: 'configuration'; summary: string };

export async function probeModel(
  route: { baseUrl: string; model: string },
  fetcher: (url: string) => Promise<Response>
): Promise<ProbeResult> {
  try {
    const url = `${route.baseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(route.model)}`;
    const response = await fetcher(url);
    if (response.ok) return { category: 'available', status: response.status };
    const summary = (await response.text()).slice(0, 200);
    if (response.status === 401 || response.status === 403) return { category: 'authentication', status: response.status, summary };
    if (response.status === 404) return { category: 'unavailable-model', status: response.status, summary };
    return { category: 'configuration', summary: `HTTP ${response.status}: ${summary}` };
  } catch (error) {
    return { category: 'network', summary: error instanceof Error ? error.message : String(error) };
  }
}
