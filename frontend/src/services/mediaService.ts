const API_URL = import.meta.env.VITE_API_URL || '/api';

function authorizationHeaders(token?: string) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readError(response: Response, fallback: string): Promise<never> {
  const data = await response.json().catch(() => ({}));
  throw new Error(data?.error || data?.detail || fallback);
}

export async function loadProtectedPhoto(token: string | undefined, path: string) {
  const response = await fetch(`${API_URL}${path}`, { headers: authorizationHeaders(token) });
  if (!response.ok) return readError(response, 'Photo could not be loaded.');
  return URL.createObjectURL(await response.blob());
}

export async function downloadQuotePhotos(token: string | undefined, quoteId: number) {
  const response = await fetch(`${API_URL}/quotes/${quoteId}/photos-download`, {
    method: 'POST',
    headers: authorizationHeaders(token)
  });
  if (!response.ok) return readError(response, 'Quote photos could not be downloaded.');
  const result = await response.json();
  const link = document.createElement('a');
  link.href = `${API_URL}${result.url}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
