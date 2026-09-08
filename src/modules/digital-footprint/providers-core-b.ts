import 'server-only';

import type { FootprintExposedData, FootprintFinding, FootprintProvider } from './types';
import { finding, asExposed, pickExposed, safeSourceUrl } from './providers-core-a';

export const leakCheckPublic: FootprintProvider = {
    id: 'leakcheck-public', label: 'LeakCheck Public', category: 'breach', supports: ['email', 'phone', 'username'], configured: () => true,
    async check({ email, phone, usernames, signal }) {
        const lookup = email || phone || usernames[0];
        if (!lookup) return [];
        const response = await fetch(`https://leakcheck.io/api/public?check=${encodeURIComponent(lookup)}`, {
            signal, cache: 'no-store', headers: { Accept: 'application/json', 'User-Agent': 'NecrotixLab-Digital-Footprint' },
        });
        if (response.status === 404) return [];
        if (response.status === 429) return [finding({ provider: 'leakcheck-public', category: 'breach', title: 'LeakCheck rate limit', status: 'rate-limited', confidence: 100, risk: 'info', summary: 'The public provider asked the scanner to retry later.', remediation: ['Run the check again later.'] })];
        if (!response.ok) throw new Error(`LeakCheck ${response.status}`);
        const payload = await response.json() as { found?: unknown; fields?: unknown[]; sources?: Array<{ name?: unknown; date?: unknown }> };
        const fields = Array.isArray(payload.fields) ? payload.fields.map(String) : [];
        const passwordExposed = fields.some((value) => /password/i.test(value));
        return (payload.sources || []).map((source) => finding({
            provider: 'leakcheck-public', category: 'breach', title: String(source.name || 'Leak source'), status: 'found', confidence: 90,
            risk: passwordExposed ? 'critical' : 'high',
            summary: `LeakCheck reports ${Number(payload.found || 0).toLocaleString()} matching records across its public result. Sensitive field values are not returned by this integration.`,
            sourceUrl: 'https://leakcheck.io/',
            exposedFields: fields,
            exposedData: asExposed({
                Source: String(source.name || ''),
                Date: source.date ? String(source.date) : undefined,
                'Matching records': Number(payload.found || 0),
                'Data classes': fields.length ? fields.join(', ') : undefined,
                Identifier: lookup,
            }),
            occurredAt: String(source.date || ''),
            remediation: passwordExposed ? ['Change reused passwords and enable multi-factor authentication.'] : ['Review the affected accounts and remove unnecessary public data.'],
        }));
    },
};

export const xposedOrNot: FootprintProvider = {
    id: 'xposedornot', label: 'XposedOrNot', category: 'breach', supports: ['email'], configured: () => true,
    async check({ email, signal }) {
        if (!email) return [];
        const response = await fetch(`https://api.xposedornot.com/v1/breach-analytics?email=${encodeURIComponent(email)}`, {
            signal, cache: 'no-store', headers: { Accept: 'application/json', 'User-Agent': 'NecrotixLab-Digital-Footprint' },
        });
        if (response.status === 404) return [];
        if (response.status === 429) return [finding({ provider: 'xposedornot', category: 'breach', title: 'XposedOrNot rate limit', status: 'rate-limited', confidence: 100, risk: 'info', summary: 'The public provider asked the scanner to retry later.', remediation: ['Run the check again later.'] })];
        if (!response.ok) throw new Error(`XposedOrNot ${response.status}`);
        const payload = await response.json() as { ExposedBreaches?: { breaches_details?: Array<Record<string, unknown>> } };
        return (payload.ExposedBreaches?.breaches_details || []).map((row) => {
            const fields = String(row.xposed_data || '').split(';').map((value) => value.trim()).filter(Boolean);
            const passwordExposed = fields.some((value) => /password/i.test(value));
            const details = String(row.details || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            return finding({
                provider: 'xposedornot', category: 'breach', title: String(row.breach || 'Data exposure'), status: 'found', confidence: row.verified === true ? 95 : 80,
                risk: passwordExposed ? 'critical' : 'high',
                summary: [details, row.industry ? `Industry: ${String(row.industry)}.` : '', row.xposed_records ? `Reported records: ${Number(row.xposed_records).toLocaleString()}.` : ''].filter(Boolean).join(' '),
                sourceUrl: safeSourceUrl(row.domain),
                exposedFields: fields,
                exposedData: asExposed({
                    Breach: String(row.breach || ''),
                    Domain: row.domain ? String(row.domain) : undefined,
                    Industry: row.industry ? String(row.industry) : undefined,
                    Date: row.xposed_date ? String(row.xposed_date) : undefined,
                    'Records reported': typeof row.xposed_records === 'number' ? row.xposed_records : (row.xposed_records ? Number(row.xposed_records) : undefined),
                    Verified: row.verified === true,
                    'Data classes': fields.length ? fields.join(', ') : undefined,
                    Details: details || undefined,
                    'Matched email': email,
                }),
                occurredAt: String(row.xposed_date || ''),
                remediation: passwordExposed ? ['Change reused passwords and enable multi-factor authentication.'] : ['Review the affected account and its privacy settings.'],
            });
        });
    },
};

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
                title: `Info-stealer exposure ${stealers.length > 1 ? '#' + (index + 1) : ''}`.trim(),
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
