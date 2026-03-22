type JoseModule = typeof import('jose');

let joseCache: JoseModule | null = null;

/**
 * Load `jose` with real dynamic `import()` — `tsc` with `module: commonjs` turns `import('jose')`
 * into `require('jose')`, which breaks ESM-only jose on Vercel (ERR_REQUIRE_ESM).
 */
async function getJose(): Promise<JoseModule> {
  if (!joseCache) {
    const load = new Function('return import("jose");') as () => Promise<JoseModule>;
    joseCache = await load();
  }
  return joseCache;
}

const getSecret = (): Uint8Array => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return new TextEncoder().encode(secret);
};

export async function signAccessToken(user: {
  id: number;
  email: string;
  role: string;
  name: string;
}): Promise<string> {
  const jose = await getJose();
  const token = await new jose.SignJWT({
    email: user.email,
    role: user.role,
    name: user.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN ?? '7d')
    .sign(getSecret());

  return token;
}

export async function verifyAccessToken(token: string): Promise<{
  sub: string;
  email: string;
  role: string;
  name: string;
}> {
  const jose = await getJose();
  const { payload } = await jose.jwtVerify(token, getSecret());
  const sub = payload.sub;
  const email = payload.email;
  const role = payload.role;
  const name = payload.name;
  if (typeof sub !== 'string' || typeof email !== 'string' || typeof role !== 'string' || typeof name !== 'string') {
    throw new Error('Invalid token payload');
  }
  return { sub, email, role, name };
}
