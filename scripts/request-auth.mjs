import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { dniLoginAlias } from './dni-login.mjs';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cookieName = 'ayni_session';
const refreshCookieName = 'ayni_refresh';
const activityCookieName = 'ayni_active';
const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
const thirtyDaysSeconds = 30 * 24 * 60 * 60;

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

function signedRefreshValue(token, signingKey) {
  const payload = Buffer.from(JSON.stringify({ token })).toString('base64url');
  const signature = createHmac('sha256', signingKey).update(`ayni-refresh-v1.${payload}`).digest('base64url');
  return `v1.${payload}.${signature}`;
}

function readSignedRefresh(header, signingKey) {
  const raw = cookieValue(header, refreshCookieName);
  if (!raw) return null;
  const parts = raw.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1' || raw.length > 4096) throw new RequestAuthError();
  const expected = createHmac('sha256', signingKey).update(`ayni-refresh-v1.${parts[1]}`).digest();
  let provided;
  try { provided = Buffer.from(parts[2], 'base64url'); }
  catch { throw new RequestAuthError(); }
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) throw new RequestAuthError();
  let value;
  try { value = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')); }
  catch { throw new RequestAuthError(); }
  if (typeof value?.token !== 'string' || !value.token || value.token.length > 2048) throw new RequestAuthError();
  return value;
}

function readActivity(header, signingKey, currentTime, refreshToken) {
  const raw = cookieValue(header, activityCookieName);
  const parts = raw?.split('.') ?? [];
  if (parts.length !== 2 || !/^\d{13}$/.test(parts[0])) throw new RequestAuthError();
  const expected = createHmac('sha256', signingKey).update(`ayni-active-v1.${refreshToken}.${parts[0]}`).digest();
  let provided;
  try { provided = Buffer.from(parts[1], 'base64url'); }
  catch { throw new RequestAuthError(); }
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) throw new RequestAuthError();
  const seenAt = Number(parts[0]);
  if (seenAt > currentTime + 60_000 || currentTime - seenAt >= thirtyDaysMs) throw new RequestAuthError();
}

export function createRequestAuth({ mode = 'local', localTeacherId, supabaseUrl, publishableKey, dniPepper, dniAliasDomain, sessionSigningKey, fetchImpl = fetch, secureCookie = true, now = Date.now } = {}) {
  if (!['local', 'supabase'].includes(mode)) throw new Error('AYNI_AUTH_MODE debe ser local o supabase.');
  if (mode === 'local' && !uuid.test(localTeacherId ?? '')) throw new Error('AYNI_LOCAL_TEACHER_ID debe ser UUID en modo local.');
  if (mode === 'supabase') {
    if (!supabaseUrl || !publishableKey) throw new Error('Falta AYNI_SUPABASE_URL o AYNI_SUPABASE_PUBLISHABLE_KEY.');
    dniLoginAlias('00000000', dniPepper, dniAliasDomain);
    if (typeof sessionSigningKey !== 'string' || sessionSigningKey.length < 32) throw new Error('Falta AYNI_SESSION_SIGNING_KEY de al menos 32 caracteres.');
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
    if (!uuid.test(user?.id ?? '') || user?.role !== 'authenticated' || user?.app_metadata?.ayni_role !== 'teacher') throw new RequestAuthError();
    return user;
  }

  async function refreshSession(refreshToken) {
    let response;
    try {
      response = await fetchImpl(authUrl(supabaseUrl, '/auth/v1/token?grant_type=refresh_token'), {
        method: 'POST',
        headers: { apikey: publishableKey, 'content-type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
        signal: AbortSignal.timeout(8000), cache: 'no-store',
      });
    } catch { throw new RequestAuthError('No se pudo renovar la sesión. Inténtalo de nuevo.', 503); }
    if (!response.ok) throw new RequestAuthError();
    let session;
    try { session = await response.json(); }
    catch { throw new RequestAuthError(); }
    if (typeof session?.access_token !== 'string' || typeof session?.refresh_token !== 'string'
      || !session.refresh_token) throw new RequestAuthError();
    return { token: session.access_token, refreshToken: session.refresh_token,
      expiresIn: Number(session.expires_in) || 3600 };
  }

  const flags = `HttpOnly; Path=/api; SameSite=Lax${secureCookie ? '; Secure' : ''}`;
  const accessCookie = (token, expiresIn) => `${cookieName}=${token}; Max-Age=${Math.max(1, Math.min(3600, Math.floor(expiresIn)))}; ${flags}`;
  const refreshCookie = (token) => `${refreshCookieName}=${signedRefreshValue(token, sessionSigningKey)}; Max-Age=${thirtyDaysSeconds}; ${flags}`;
  const activityCookie = (refreshToken) => {
    const seenAt = String(now());
    const signature = createHmac('sha256', sessionSigningKey).update(`ayni-active-v1.${refreshToken}.${seenAt}`).digest('base64url');
    return `${activityCookieName}=${seenAt}.${signature}; Max-Age=${thirtyDaysSeconds}; ${flags}`;
  };
  const sessionCookies = ({ token, refreshToken, expiresIn }) => [accessCookie(token, expiresIn), refreshCookie(refreshToken), activityCookie(refreshToken)];
  const clearCookies = () => [cookieName, refreshCookieName, activityCookieName].map((name) => `${name}=; Max-Age=0; ${flags}`);

  async function resolve(request, db) {
    const requestId = randomUUID();
    if (mode === 'local') return { teacherId: localTeacherId, requestId, db, authMode: mode };
    const credentials = requestToken(request);
    if (credentials?.source === 'bearer') {
      const user = await verifyToken(credentials.token);
      return { teacherId: user.id, requestId, db, authMode: mode, tokenSource: 'bearer' };
    }
    const retained = readSignedRefresh(request.headers.cookie, sessionSigningKey);
    if (retained) readActivity(request.headers.cookie, sessionSigningKey, now(), retained.token);
    if (!retained) throw new RequestAuthError();
    let token = credentials?.token, user, cookies;
    if (token) {
      try { user = await verifyToken(token); }
      catch (error) {
        if (!(error instanceof RequestAuthError) || error.status !== 401 || !retained) throw error;
      }
    }
    if (!user) {
      const renewed = await refreshSession(retained.token);
      token = renewed.token;
      user = await verifyToken(token);
      cookies = sessionCookies(renewed);
    } else cookies = [refreshCookie(retained.token), activityCookie(retained.token)];
    return { teacherId: user.id, requestId, db, authMode: mode, tokenSource: 'cookie', sessionCookies: cookies };
  }

  async function signIn(dni, password) {
    if (mode !== 'supabase') throw new RequestAuthError('Inicio de sesión no disponible en modo local.', 404);
    if (typeof dni !== 'string' || !/^\d{8}$/.test(dni) || typeof password !== 'string' || password.length > 1024 || !password) {
      throw new RequestAuthError('DNI o contraseña inválidos.');
    }
    const email = dniLoginAlias(dni, dniPepper, dniAliasDomain);
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
    if (!response.ok) throw new RequestAuthError('DNI o contraseña inválidos.');
    let session;
    try { session = await response.json(); }
    catch { throw new RequestAuthError(); }
    if (typeof session?.access_token !== 'string' || typeof session?.refresh_token !== 'string'
      || !session.refresh_token) throw new RequestAuthError();
    const user = await verifyToken(session.access_token);
    return { token: session.access_token, refreshToken: session.refresh_token,
      teacherId: user.id, expiresIn: Number(session.expires_in) || 3600 };
  }

  async function signOut(request) {
    const credentials = requestToken(request);
    if (mode !== 'supabase') return;
    let token = credentials?.token;
    if (!token) {
      try {
        const retained = readSignedRefresh(request.headers.cookie, sessionSigningKey);
        if (retained) token = (await refreshSession(retained.token)).token;
      } catch { return; }
    }
    if (!token) return;
    try {
      let response = await fetchImpl(authUrl(supabaseUrl, '/auth/v1/logout?scope=local'), {
        method: 'POST',
        headers: { apikey: publishableKey, authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        const retained = readSignedRefresh(request.headers.cookie, sessionSigningKey);
        if (retained) {
          token = (await refreshSession(retained.token)).token;
          response = await fetchImpl(authUrl(supabaseUrl, '/auth/v1/logout?scope=local'), {
            method: 'POST', headers: { apikey: publishableKey, authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(8000),
          });
        }
      }
    } catch { /* The browser cookie is cleared even when remote revocation fails. */ }
  }

  return {
    mode, resolve, signIn, signOut,
    sessionCookies, clearCookies,
  };
}
