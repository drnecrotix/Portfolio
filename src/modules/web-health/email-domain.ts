import 'server-only';

import { resolveCaa, resolveMx, resolveTxt } from 'node:dns/promises';
import { domainToASCII } from 'node:url';
import { scoreHealthChecks } from './scoring';
import type { EmailDomainReport, HealthCheck } from './types';

function normalizeDomain(input: string) {
    let value = input.trim().toLowerCase();
    if (!value) throw new Error('Enter a domain name.');
    if (value.includes('@') && !value.includes('://')) value = value.split('@').pop() ?? value;
    if (/^https?:\/\//i.test(value)) {
        try {
            value = new URL(value).hostname;
        } catch {
            throw new Error('Enter a valid domain name.');
        }
    }
    value = value.replace(/\.$/, '');
    const ascii = domainToASCII(value);
    if (!ascii || ascii.length > 253 || ascii === 'localhost' || ascii.endsWith('.local') || ascii.endsWith('.internal')) {
        throw new Error('Enter a valid public domain name.');
    }
    const labels = ascii.split('.');
    if (labels.length < 2 || labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))) {
        throw new Error('Enter a valid public domain name.');
    }
    return ascii;
}

async function txt(name: string) {
    try {
        return (await resolveTxt(name)).map((parts) => parts.join(''));
    } catch {
        return [];
    }
}

async function mx(domain: string) {
    try {
        return (await resolveMx(domain)).sort((a, b) => a.priority - b.priority);
    } catch {
        return [];
    }
}

async function caa(domain: string) {
    try {
        return await resolveCaa(domain);
    } catch {
        return [];
    }
}

export async function inspectEmailDomain(input: string, selector?: string): Promise<EmailDomainReport> {
    const domain = normalizeDomain(input);
    const cleanSelector = String(selector ?? '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 63);

    const [mxRecords, rootTxt, dmarcTxt, mtaStsTxt, tlsRptTxt, bimiTxt, caaRecords, dkimTxt] = await Promise.all([
        mx(domain),
        txt(domain),
        txt(`_dmarc.${domain}`),
        txt(`_mta-sts.${domain}`),
        txt(`_smtp._tls.${domain}`),
        txt(`default._bimi.${domain}`),
        caa(domain),
        cleanSelector ? txt(`${cleanSelector}._domainkey.${domain}`) : Promise.resolve([]),
    ]);

    const spfRecords = rootTxt.filter((record) => /^v=spf1\b/i.test(record));
    const dmarcRecords = dmarcTxt.filter((record) => /^v=dmarc1\b/i.test(record));
    const mtaSts = mtaStsTxt.find((record) => /^v=stsv1\b/i.test(record));
    const tlsRpt = tlsRptTxt.find((record) => /^v=tlsrptv1\b/i.test(record));
    const bimi = bimiTxt.find((record) => /^v=bimi1\b/i.test(record));
    const dkim = dkimTxt.find((record) => /^v=dkim1\b/i.test(record)) ?? dkimTxt[0];
    const checks: HealthCheck[] = [];

    checks.push({
        id: 'mx', label: 'Mail exchangers', status: mxRecords.length ? 'pass' : 'fail',
        summary: mxRecords.length ? `${mxRecords.length} MX record${mxRecords.length === 1 ? '' : 's'} detected.` : 'No MX records were detected for this domain.',
        recommendation: mxRecords.length ? undefined : 'Configure at least one valid MX record if this domain should receive email.',
    });

    checks.push({
        id: 'spf', label: 'SPF',
        status: spfRecords.length === 1 ? 'pass' : spfRecords.length > 1 ? 'fail' : 'warning',
        summary: spfRecords.length === 1 ? spfRecords[0] : spfRecords.length > 1 ? `${spfRecords.length} SPF records were detected; SPF should normally be published as one record.` : 'No SPF record was detected.',
        recommendation: spfRecords.length === 1 ? undefined : spfRecords.length > 1 ? 'Merge authorized senders into one SPF policy.' : 'Publish an SPF policy that authorizes only the services that send mail for this domain.',
    });

    const dmarc = dmarcRecords[0];
    const dmarcPolicy = dmarc?.match(/(?:^|;)\s*p\s*=\s*([^;\s]+)/i)?.[1]?.toLowerCase();
    checks.push({
        id: 'dmarc', label: 'DMARC',
        status: !dmarc ? 'fail' : ['reject', 'quarantine'].includes(dmarcPolicy ?? '') ? 'pass' : 'warning',
        summary: !dmarc ? 'No DMARC policy was detected.' : `DMARC policy detected${dmarcPolicy ? ` with p=${dmarcPolicy}` : ''}.`,
        recommendation: !dmarc ? 'Publish a DMARC record, begin with reporting, then move toward quarantine/reject after validating legitimate senders.' : dmarcPolicy === 'none' ? 'Review DMARC reports and move toward quarantine or reject when legitimate mail is aligned.' : undefined,
    });

    checks.push({
        id: 'dkim', label: 'DKIM', status: cleanSelector ? (dkim ? 'pass' : 'warning') : 'info',
        summary: cleanSelector ? (dkim ? `A DKIM record was found for selector “${cleanSelector}”.` : `No DKIM record was found for selector “${cleanSelector}”.`) : 'DKIM is selector-specific. Enter the selector used by your mail provider to verify its public key.',
        recommendation: cleanSelector && !dkim ? 'Confirm the selector with the mail provider and publish the matching DKIM public key.' : undefined,
    });

    checks.push({
        id: 'mta-sts', label: 'MTA-STS', status: mtaSts ? 'pass' : 'warning',
        summary: mtaSts ? 'The MTA-STS discovery TXT record is present.' : 'No MTA-STS discovery TXT record was detected.',
        recommendation: mtaSts ? undefined : 'Consider MTA-STS to require authenticated TLS for supported inbound mail delivery.',
    });

    checks.push({
        id: 'tls-rpt', label: 'SMTP TLS reporting', status: tlsRpt ? 'pass' : 'info',
        summary: tlsRpt ? 'A TLS-RPT policy is present.' : 'No TLS-RPT policy was detected.',
        recommendation: tlsRpt ? undefined : 'TLS-RPT can provide reports about failed encrypted mail delivery.',
    });

    checks.push({
        id: 'caa', label: 'CAA', status: caaRecords.length ? 'pass' : 'info',
        summary: caaRecords.length ? `${caaRecords.length} direct CAA record${caaRecords.length === 1 ? '' : 's'} detected.` : 'No direct CAA record was detected. Parent-domain inheritance is not evaluated by this lightweight check.',
        recommendation: caaRecords.length ? undefined : 'If certificate issuance control is required, publish CAA records for approved certificate authorities.',
    });

    checks.push({
        id: 'bimi', label: 'BIMI', status: 'info',
        summary: bimi ? 'A BIMI record was detected.' : 'No BIMI record was detected. BIMI is optional and mainly affects supported brand-logo display.',
    });

    return {
        domain,
        checkedAt: new Date().toISOString(),
        score: scoreHealthChecks(checks),
        checks,
        records: {
            mx: mxRecords.map((record) => `${record.priority} ${record.exchange}`),
            spf: spfRecords[0],
            dmarc,
            dkim,
            mtaSts,
            tlsRpt,
            bimi,
            caaCount: caaRecords.length,
        },
    };
}
