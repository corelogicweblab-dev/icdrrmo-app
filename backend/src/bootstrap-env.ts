/**
 * Normalize required env before Nest boots (Render, Docker, local).
 * Maps legacy JWT_SECRET → JWT_ACCESS_SECRET and fails fast with actionable logs.
 */
export function bootstrapEnv(): void {
  const jwt =
    process.env.JWT_ACCESS_SECRET?.trim() || process.env.JWT_SECRET?.trim();
  if (!jwt) {
    // eslint-disable-next-line no-console
    console.error(`
[ICDRRMO] FATAL: JWT_ACCESS_SECRET is not set.

Add it in Render → your Web Service → Environment:
  Key:   JWT_ACCESS_SECRET
  Value: output of: openssl rand -base64 48

(If you only have JWT_SECRET, rename it to JWT_ACCESS_SECRET — the API no longer reads JWT_SECRET alone without this bootstrap.)

See docs/RENDER_DEPLOY.md
`);
    process.exit(1);
  }
  if (jwt.length < 32) {
    // eslint-disable-next-line no-console
    console.error(
      '[ICDRRMO] FATAL: JWT_ACCESS_SECRET must be at least 32 characters.',
    );
    process.exit(1);
  }
  if (!process.env.JWT_ACCESS_SECRET?.trim() && process.env.JWT_SECRET?.trim()) {
    // eslint-disable-next-line no-console
    console.warn(
      '[ICDRRMO] Using legacy JWT_SECRET — set JWT_ACCESS_SECRET on Render and remove JWT_SECRET.',
    );
  }
  process.env.JWT_ACCESS_SECRET = jwt;

  if (!process.env.DATABASE_URL?.trim()) {
    // eslint-disable-next-line no-console
    console.error(
      '[ICDRRMO] FATAL: DATABASE_URL is not set (Render Postgres external URL).',
    );
    process.exit(1);
  }

  if (!process.env.PORT?.trim()) {
    process.env.PORT = '4000';
  }

  const windy =
    process.env.WINDY_API_KEY?.trim() ||
    process.env.WINDY_KEY?.trim() ||
    process.env.WINDY_API?.trim();
  if (!windy && process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      '[ICDRRMO] WINDY_API_KEY is not set — weather maps will use fallback radar until you add it on Render (icdrrmo-api → Environment).',
    );
  }
}
