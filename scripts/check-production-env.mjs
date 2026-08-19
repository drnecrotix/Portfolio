const required = ['DATABASE_URL', 'AUTH_SECRET', 'NEXT_PUBLIC_SITE_URL'];
const missing = required.filter((name) => !String(process.env[name] || '').trim());

const errors = [];

if (missing.length) {
  errors.push(`Missing required variables: ${missing.join(', ')}`);
}

const authSecret = String(process.env.AUTH_SECRET || '');
if (authSecret && authSecret.length < 32) {
  errors.push('AUTH_SECRET must be at least 32 characters in production.');
}

const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || '');
if (siteUrl) {
  try {
    const url = new URL(siteUrl);
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      errors.push('NEXT_PUBLIC_SITE_URL must use HTTPS in production.');
    }
  } catch {
    errors.push('NEXT_PUBLIC_SITE_URL must be a valid absolute URL.');
  }
}

const ownerPassword = String(process.env.OWNER_PASSWORD || '');
if (ownerPassword && ownerPassword.length < 12) {
  errors.push('OWNER_PASSWORD must be at least 12 characters when provided.');
}

const r2Values = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_PUBLIC_BASE_URL',
].map((name) => [name, String(process.env[name] || '').trim()]);
const configuredR2 = r2Values.filter(([, value]) => value).length;
if (configuredR2 > 0 && configuredR2 !== r2Values.length) {
  errors.push('Cloudflare R2 is partially configured. Set all R2 variables or none of them.');
}

const smtpValues = ['EMAIL_USER', 'EMAIL_APP_PASSWORD', 'SMTP_HOST', 'SMTP_PORT'].map((name) => [name, String(process.env[name] || '').trim()]);
const configuredSmtp = smtpValues.filter(([, value]) => value).length;
if (configuredSmtp > 0 && configuredSmtp !== smtpValues.length) {
  errors.push('SMTP is partially configured. Set EMAIL_USER, EMAIL_APP_PASSWORD, SMTP_HOST and SMTP_PORT together.');
}

if (errors.length) {
  console.error('Production preflight failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Production environment preflight passed.');
