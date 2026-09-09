import 'server-only';

import { randomUUID } from 'node:crypto';
import type { FootprintExposedData, FootprintFinding, FootprintProvider } from './types';
import { socialProfiles } from './social-profiles';

function finding(input: Omit<FootprintFinding, 'id'>): FootprintFinding {
    return { id: randomUUID(), ...input };
}

function asExposed(data: FootprintExposedData): FootprintExposedData | undefined {
    return Object.keys(data).length ? data : undefined;
}

export const hudsonRock: FootprintProvider = {
    id: 'hudsonrock', label: 'Hudson Rock', category: 'breach', supports: ['email'], configured: () => true,
    async check({ email, signal }) {
        if (!email) return [];
        const response = await fetch(`https://cavalier.hudsonrock.com/api/json/v2/osint-tools/search-by-email?email=${encodeURIComponent(email)}`, {
            signal, cache: 'no-store', headers: { Accept: 'application/json', 'User-Agent': 'NecrotixLab-Digital-Footprint' },
        });
        if (response.status === 404) return [];
        if (response.status === 429) return [finding({ provider: 'hudsonrock', category: 'breach', title: 'Hudson Rock rate limit', status: 'rate-limited', confidence: 100, risk: 'info', summary: 'The provider asked the scanner to retry later.', remediation: ['Run the check again later.'] })];
        if (!response.ok) throw new Error(`Hudson Rock ${response.status}`);
        const payload = await response.json() as { message?: string; stealers?: Array<Record<string, unknown>> };
        const stealers = Array.isArray(payload.stealers) ? payload.stealers : [];
        if (!stealers.length) return [];
        return stealers.slice(0, 8).map((row, index) => {
            const date = row.date_compromised ? String(row.date_compromised) : undefined;
            const exposedData = asExposed({
                Signal: 'Info-stealer association',
                'Compromise date': date,
                'Computer name': row.computer_name ? String(row.computer_name) : undefined,
                'Operating system': row.operating_system ? String(row.operating_system) : undefined,
                'Corporate services': typeof row.total_corporate_services === 'number' ? row.total_corporate_services : undefined,
                'User services': typeof row.total_user_services === 'number' ? row.total_user_services : undefined,
                'Matched email': email,
                Note: 'Password values are not displayed. Treat every password used on that device as compromised.',
            });
            return finding({
                provider: 'hudsonrock',
                category: 'breach',
                title: stealers.length > 1 ? `Info-stealer exposure #${index + 1}` : 'Info-stealer exposure',
                status: 'found',
                confidence: 90,
                risk: 'critical',
                summary: String(payload.message || 'This email was seen in info-stealer malware telemetry. Credentials saved on the infected device may be exposed to attackers.'),
                sourceUrl: 'https://www.hudsonrock.com/free-tools',
                exposedFields: ['Info-stealer telemetry', 'Device metadata', 'Service counts'],
                exposedData,
                occurredAt: date,
                remediation: [
                    'Change passwords for accounts used on the infected device.',
                    'Enable multi-factor authentication everywhere possible.',
                    'Scan the device with up-to-date antivirus / reinstall the OS if compromise is confirmed.',
                ],
            });
        });
    },
};

/** Optional LeakCheck Pro — structured records when LEAKCHECK_API_KEY is set. Passwords are never surfaced. */
const leakCheckPro: FootprintProvider = {
    id: 'leakcheck-pro', label: 'LeakCheck Pro', category: 'breach', supports: ['email', 'phone', 'username'],
    configured: () => Boolean(process.env.LEAKCHECK_API_KEY),
    async check({ email, phone, usernames, signal }) {
        const key = process.env.LEAKCHECK_API_KEY;
        const lookup = email || phone || usernames[0];
        if (!key || !lookup) return [];
        const response = await fetch(`https://leakcheck.io/api/v2/query/${encodeURIComponent(lookup)}`, {
            signal, cache: 'no-store',
            headers: { Accept: 'application/json', 'X-API-Key': key, 'User-Agent': 'NecrotixLab-Digital-Footprint' },
        });
        if (response.status === 404) return [];
        if (response.status === 401 || response.status === 403) {
            return [finding({ provider: 'leakcheck-pro', category: 'breach', title: 'LeakCheck Pro auth', status: 'error', confidence: 0, risk: 'info', summary: 'LeakCheck Pro API key was rejected.', remediation: ['Check LEAKCHECK_API_KEY in Admin → API Integrations.'] })];
        }
        if (response.status === 429) return [finding({ provider: 'leakcheck-pro', category: 'breach', title: 'LeakCheck Pro rate limit', status: 'rate-limited', confidence: 100, risk: 'info', summary: 'Rate limited by LeakCheck Pro.', remediation: ['Retry later.'] })];
        if (!response.ok) throw new Error(`LeakCheck Pro ${response.status}`);
        const payload = await response.json() as { success?: boolean; found?: number; result?: Array<Record<string, unknown>> };
        const rows = Array.isArray(payload.result) ? payload.result.slice(0, 25) : [];
        return rows.map((row, index) => {
            const source = String(row.source || row.origin || row.breach || `Record #${index + 1}`);
            const fields: string[] = [];
            const exposedData: FootprintExposedData = { Source: source, 'Matched query': lookup };
            for (const [k, v] of Object.entries(row)) {
                if (v === undefined || v === null || v === '') continue;
                const keyLower = k.toLowerCase();
                if (['password', 'pass', 'hash', 'pwd', 'secret', 'token'].some((s) => keyLower.includes(s))) {
                    fields.push(k);
                    exposedData[k.replace(/_/g, ' ')] = '[redacted — not displayed]';
                    continue;
                }
                if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
                    fields.push(k);
                    exposedData[k.replace(/_/g, ' ')] = v;
                }
            }
            const passwordExposed = fields.some((f) => /pass|pwd|hash/i.test(f));
            return finding({
                provider: 'leakcheck-pro', category: 'breach', title: source, status: 'found', confidence: 95,
                risk: passwordExposed ? 'critical' : 'high',
                summary: 'LeakCheck Pro returned a structured breach record. Password and secret values are redacted by NecrotixLab.',
                sourceUrl: 'https://leakcheck.io/',
                exposedFields: fields.slice(0, 20),
                exposedData,
                occurredAt: typeof row.date === 'string' ? row.date : (typeof row.last_breach === 'string' ? row.last_breach : undefined),
                remediation: passwordExposed
                    ? ['Treat every password associated with this identifier as compromised.', 'Enable multi-factor authentication.']
                    : ['Review the exposed fields and rotate credentials where relevant.'],
            });
        });
    },
};

/** Optional DeHashed — structured identity records when DEHASHED_EMAIL + DEHASHED_API_KEY are set. Secrets redacted. */
const dehashed: FootprintProvider = {
    id: 'dehashed', label: 'DeHashed', category: 'breach', supports: ['email', 'phone', 'username'],
    configured: () => Boolean(process.env.DEHASHED_EMAIL && process.env.DEHASHED_API_KEY),
    async check({ email, phone, usernames, signal }) {
        const deEmail = process.env.DEHASHED_EMAIL;
        const deKey = process.env.DEHASHED_API_KEY;
        const lookup = email || phone || usernames[0];
        if (!deEmail || !deKey || !lookup) return [];
        let query = '';
        if (email) query = `email:${email}`;
        else if (phone) query = `phone:${phone}`;
        else query = `username:${usernames[0]}`;
        const auth = Buffer.from(`${deEmail}:${deKey}`).toString('base64');
        const response = await fetch(`https://api.dehashed.com/v2/search`, {
            method: 'POST', signal, cache: 'no-store',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Basic ${auth}`,
                'User-Agent': 'NecrotixLab-Digital-Footprint',
            },
            body: JSON.stringify({ query, page: 1, size: 20, wildcard: false, regex: false, de_duplicate: true }),
        });
        if (response.status === 401 || response.status === 403) {
            return [finding({ provider: 'dehashed', category: 'breach', title: 'DeHashed auth', status: 'error', confidence: 0, risk: 'info', summary: 'DeHashed credentials were rejected.', remediation: ['Check DEHASHED_EMAIL and DEHASHED_API_KEY in Admin → API Integrations.'] })];
        }
        if (response.status === 429) return [finding({ provider: 'dehashed', category: 'breach', title: 'DeHashed rate limit', status: 'rate-limited', confidence: 100, risk: 'info', summary: 'Rate limited by DeHashed.', remediation: ['Retry later.'] })];
        if (!response.ok) throw new Error(`DeHashed ${response.status}`);
        const payload = await response.json() as { entries?: Array<Record<string, unknown>>; total?: number };
        const rows = Array.isArray(payload.entries) ? payload.entries.slice(0, 20) : [];
        return rows.map((row, index) => {
            const database = String(row.database_name || row.db_name || `Entry #${index + 1}`);
            const fields: string[] = [];
            const exposedData: FootprintExposedData = { Database: database, 'Matched query': lookup };
            const map: Array<[string, string]> = [
                ['email', 'Email'], ['username', 'Username'], ['name', 'Name'], ['vin', 'VIN'],
                ['address', 'Address'], ['phone', 'Phone'], ['company', 'Company'], ['url', 'URL'],
                ['ip_address', 'IP address'], ['dob', 'Date of birth'],
            ];
            for (const [src, label] of map) {
                const v = row[src];
                if (Array.isArray(v) && v.length) {
                    fields.push(label);
                    exposedData[label] = v.map(String).slice(0, 3).join(', ');
                } else if (typeof v === 'string' && v) {
                    fields.push(label);
                    exposedData[label] = v;
                }
            }
            if (row.password || row.hashed_password) {
                fields.push('Password');
                exposedData.Password = '[redacted — not displayed]';
            }
            const passwordExposed = Boolean(row.password || row.hashed_password);
            return finding({
                provider: 'dehashed', category: 'breach', title: database, status: 'found', confidence: 95,
                risk: passwordExposed ? 'critical' : 'high',
                summary: 'DeHashed returned a structured identity record. Password values are redacted by NecrotixLab.',
                sourceUrl: 'https://dehashed.com/',
                exposedFields: fields,
                exposedData,
                remediation: passwordExposed
                    ? ['Change passwords associated with this identity everywhere they were reused.', 'Enable multi-factor authentication.']
                    : ['Review the exposed identity fields and lock down accounts that still use them.'],
            });
        });
    },
};

export const extraProviders: FootprintProvider[] = [hudsonRock, socialProfiles, leakCheckPro, dehashed];
