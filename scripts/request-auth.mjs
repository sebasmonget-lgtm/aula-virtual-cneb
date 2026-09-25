import { randomUUID } from 'node:crypto';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cookieName = 'ayni_session';

export class RequestAuthError extends Error {
  constructor(message = 'Inicia sesión para continuar.', status = 401) {
    super(message);
    this.status = status;
  }
}

function cookieValue(header, name) {
  const cookies = String(header ?? '').split(';');
  const entry = cookies.map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : null;
}

function requestToken(request) {
  const authorization = request.headers.authorization;
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
    return { token: authorization.slice(7).trim(), source: 'bearer' };
  }
  const token = cookieValue(request.headers.cookie, cookieName);
  return token ? { token, source: 'cookie' } : null;
}

function authUrl(base, path) {
  return new URL(path, `${base.replace(/\/$/, '')}/`).toString();
}

export function createRequestAuth({ mode = 'local', localTeacherId, supabaseUrl, publishableKey, fetchImpl = fetch, secureCookie = true } = {}) {
  if (!['local', 'supabase'].includes(mode)) throw new Error('AYNI_AUTH_MODE debe ser local o supabase.');
  if (mode === 'local' && !uuid.test(localTeacherId ?? '')) throw new Error('AYNI_LOCAL_TEACHER_ID debe ser UUID en modo local.');
  if (mode === 'supabase') {
    if (!supabaseUrl || !publishableKey) throw new Error('Falta AYNI_SUPABASE_URL o AYNI_SUPABASE_PUBLISHABLE_KEY.');
    const endpoint = new URL(supabaseUrl);
    if (endpoint.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(endpoint.hostname)) {
      throw new Error('Supabase Auth requiere HTTPS.');
    }
  }

  async function verifyToken(token) {
    if (!token || token.length > 8192) throw new RequestAuthError();
    let response;
    try {
      response = await fetchImpl(authUrl(supabaseUrl, '/auth/v1/user'), {
        method: 'GET',
        headers: { apikey: publishableKey, authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      });
    } catch {
      throw new RequestAuthError('No se pudo verificar la sesión. Inténtalo de nuevo.', 503);
    }
    if (!response.ok) throw new RequestAuthError();
    let user;
    try { user = await response.json(); }
    catch { throw new RequestAuthError(); }
    if (!uuid.test(user?.id ?? '') || user?.role !== 'authenticated') throw new RequestAuthError();
    return user;
  }

  async function resolve(request, db) {
    const requestId = randomUUID();
    if (mode === 'local') return { teacherId: localTeacherId, requestId, db, authMode: mode };
    const credentials = requestToken(request);
    if (!credentials) throw new RequestAuthError();
    const user = await verifyToken(credentials.token);
    return { teacherId: user.id, requestId, db, authMode: mode, tokenSource: credentials.source };
  }

  async function signIn(email, password) {
    if (mode !== 'supabase') throw new RequestAuthError('Inicio de sesión no disponible en modo local.', 404);
    if (typeof email !== 'string' || typeof password !== 'string' || !email.includes('@') || email.length > 254 || password.length > 1024 || !password) {
      throw new RequestAuthError('Correo o contraseña inválidos.');
    }
    let response;
    try {
      response = await fetchImpl(authUrl(supabaseUrl, '/auth/v1/token?grant_type=password'), {
        method: 'POST',
        headers: { apikey: publishableKey, 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      });
    } catch {
      throw new RequestAuthError('No se pudo iniciar sesión. Inténtalo de nuevo.', 503);
    }
    if (!response.ok) throw new RequestAuthError('Correo o contraseña inválidos.');
    let session;
    try { session = await response.json(); }
    catch { throw new RequestAuthError(); }
    if (typeof session?.access_token !== 'string') throw new RequestAuthError();
    const user = await verifyToken(session.access_token);
    return { token: session.access_token, teacherId: user.id, expiresIn: Number(session.expires_in) || 3600 };
  }

  async function signOut(request) {
    const credentials = requestToken(request);
    if (mode !== 'supabase' || !credentials) return;
    try {
      await fetchImpl(authUrl(supabaseUrl, '/auth/v1/logout'), {
        method: 'POST',
        headers: { apikey: publishableKey, authorization: `Bearer ${credentials.token}` },
        signal: AbortSignal.timeout(8000),
      });
    } catch { /* The browser cookie is cleared even when remote revocation fails. */ }
  }

  const flags = `HttpOnly; Path=/api; SameSite=Lax${secureCookie ? '; Secure' : ''}`;
  return {
    mode, resolve, signIn, signOut,
    sessionCookie: (token, expiresIn) => `${cookieName}=${token}; Max-Age=${Math.max(1, Math.min(3600, Math.floor(expiresIn)))}; ${flags}`,
    clearCookie: () => `${cookieName}=; Max-Age=0; ${flags}`,
  };
}
