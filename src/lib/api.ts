// Shared API fetch helper with automatic Bearer token and credentials handling
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('najah_session_token') : null;
  const headers = new Headers(init.headers || {});
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('x-session-token', token);
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: init.credentials || 'include',
  });
}
