const baseUrl = import.meta.env.VITE_API_URL ?? '';

export async function api(path, { token, headers, body, ...init } = {}) {
  const url = `${baseUrl}${path}`;
  const isJsonBody = body !== undefined && typeof body === 'object' && !(body instanceof FormData);

  console.log('\n=== FRONTEND API REQUEST ===');
  console.log('URL:', url);
  console.log('Method:', init.method || 'GET');
  console.log('Headers:', {
    'Content-Type': isJsonBody ? 'application/json' : 'not set',
    'Authorization': token ? '[PRESENT]' : '[ABSENT]',
    ...headers
  });
  console.log('Body:', body);
  console.log('=============================\n');

  const res = await fetch(url, {
    ...init,
    headers: {
      ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: isJsonBody ? JSON.stringify(body) : body,
  });

  console.log('\n=== FRONTEND API RESPONSE ===');
  console.log('Status:', res.status);
  console.log('CORS Headers:', {
    'access-control-allow-origin': res.headers.get('access-control-allow-origin'),
    'access-control-allow-credentials': res.headers.get('access-control-allow-credentials'),
    'access-control-allow-methods': res.headers.get('access-control-allow-methods'),
    'access-control-allow-headers': res.headers.get('access-control-allow-headers')
  });
  console.log('==============================\n');

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    console.error('API Error:', {
      status: res.status,
      error: data?.error || res.statusText,
      data: data
    });
    const err = new Error(data?.error || res.statusText || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
