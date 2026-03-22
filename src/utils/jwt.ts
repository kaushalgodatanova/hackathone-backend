import * as jose from 'jose';

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
