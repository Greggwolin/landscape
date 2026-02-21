const djangoBaseUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export const resolveMediaUrl = (uri: string | null | undefined): string => {
  if (!uri) return '';
  if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;
  if (uri.startsWith('/')) return `${djangoBaseUrl}${uri}`;
  return `${djangoBaseUrl}/media/${uri}`;
};
