function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} environment variable is required and has no default.`);
  }

  return value;
}

export const JWT_SECRET = getRequiredEnv('JWT_SECRET');
