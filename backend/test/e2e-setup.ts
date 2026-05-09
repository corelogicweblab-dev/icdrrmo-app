/**
 * Jest e2e bootstrap: `AppModule` validates config at compile time; `.env` is not auto-loaded here.
 */
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'e2e-jwt-secret-must-be-at-least-32-chars-long!';
process.env.JWT_ACCESS_EXPIRES_SEC = process.env.JWT_ACCESS_EXPIRES_SEC ?? '900';
process.env.SMS_WEBHOOK_SECRET = process.env.SMS_WEBHOOK_SECRET ?? 'e2e-sms-webhook-secret';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://icdrrmo:icdrrmo@localhost:5432/icdrrmo?schema=public';
