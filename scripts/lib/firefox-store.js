import { createHmac, randomUUID } from 'node:crypto';
import { compareVersions } from './version.js';

export function amoToken({ issuer, secret, now = Math.floor(Date.now() / 1000), nonce = randomUUID() }) {
  if (!issuer || !secret) throw new Error('Configure AMO_JWT_ISSUER and AMO_JWT_SECRET in GitHub Actions secrets.');
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ iss: issuer, jti: nonce, iat: now, exp: now + 60 })}`;
  return `${unsigned}.${createHmac('sha256', secret).update(unsigned).digest('base64url')}`;
}

/** Verify credentials against an authenticated endpoint, not anonymous listing data. */
export async function verifyFirefox({ issuer, secret, addonId, version, fetchImpl = fetch }) {
  if (!addonId) throw new Error('The Firefox manifest must contain its existing add-on ID.');
  async function get(path, { optional = false } = {}) {
    const token = amoToken({ issuer, secret });
    const response = await fetchImpl(`https://addons.mozilla.org/api/v5/${path}`, {
      headers: { Authorization: `JWT ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(30_000), redirect: 'error',
    });
    if (optional && response.status === 404) return null;
    if (!response.ok) throw new Error(`Mozilla authentication or listing check failed (HTTP ${response.status}). Check the AMO API keys and add-on ownership.`);
    return response.json();
  }
  const profile = await get('accounts/profile/');
  const addon = await get(`addons/addon/${encodeURIComponent(addonId)}/`);
  if (!addon.authors?.some(author => author.id === profile.id)) throw new Error('The AMO API credentials do not belong to an author of this add-on.');
  const existing = version ? await get(`addons/addon/${encodeURIComponent(addonId)}/versions/${encodeURIComponent(version)}/`, { optional: true }) : null;
  return { authenticated: true, publishedVersion: addon.current_version?.version ?? null, existingVersion: existing?.version ?? null, existingStatus: existing?.file?.status ?? null, existingChannel: existing?.channel ?? null, existingDisabled: Boolean(existing?.is_disabled), hasReviewerSource: Boolean(existing?.source) };
}

export function firefoxSubmissionState(status, version) {
  if (status.publishedVersion && compareVersions(status.publishedVersion, version) > 0) throw new Error('Refusing to replace a newer Firefox store version with an older build.');
  if (status.publishedVersion === version) return 'already-published';
  if (!status.existingVersion) return 'upload';
  if (status.existingChannel === 'listed' && status.existingStatus === 'unreviewed' && !status.hasReviewerSource) throw new Error('The pending Firefox version is missing reviewer source. Attach its matching source archive in AMO before treating the submission as complete.');
  if (status.existingChannel === 'listed' && !status.existingDisabled && ['public', 'unreviewed'].includes(status.existingStatus)) return 'already-submitted';
  throw new Error('This Firefox version already exists but is disabled, rejected or in another channel. Resolve it in AMO and use a new version number.');
}
