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

export const extraProviders: FootprintProvider[] = [hudsonRock, socialProfiles];
