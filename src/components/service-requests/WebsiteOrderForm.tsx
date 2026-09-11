'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Check, ExternalLink, Loader2, Search } from 'lucide-react';
import { estimateServiceRange, type ServiceRequestIssue } from '@/modules/service-requests/estimate';

const siteTypes = [
    ['site-landing', 'Landing page', 'One focused conversion page'],
    ['site-portfolio', 'Portfolio', 'Work, profile and contact'],
    ['site-business', 'Business website', 'Company, services and enquiries'],
    ['site-blog', 'Blog / publication', 'Structured editorial content'],
    ['site-store', 'Online store', 'Catalogue, cart and checkout'],
    ['site-custom', 'Custom platform', 'Portal, workflow or web app'],
] as const;

const pageOptions = [
    ['pages-1-3', '1-3 pages'], ['pages-4-7', '4-7 pages'], ['pages-8-15', '8-15 pages'], ['pages-16-plus', '16+ pages'],
] as const;

const designOptions = [
    ['design-adapted', 'Adapted design', 'A polished design based on a proven structure'],
    ['design-custom', 'Custom design', 'Unique visual direction and page layouts'],
    ['design-premium', 'Advanced visual design', 'Rich motion, interactions or art direction'],
] as const;

const features = [
    ['feature-contact', 'Contact / enquiry form'], ['feature-blog', 'Blog and content editor'],
    ['feature-bilingual', 'Two languages'], ['feature-booking', 'Booking / appointments'],
    ['feature-commerce', 'Product catalogue and cart'], ['feature-payments', 'Online payments'],
    ['feature-accounts', 'Customer accounts'], ['feature-integrations', 'External API / CRM integration'],
    ['feature-seo', 'Technical SEO foundation'], ['feature-content-entry', 'Content entry / migration'],
    ['feature-copywriting', 'Copywriting support'], ['feature-search', 'On-site search'],
    ['feature-newsletter', 'Newsletter integration'], ['feature-social', 'Social media integration'],
    ['feature-analytics', 'Analytics and conversion tracking'], ['feature-cookie-consent', 'Cookie consent / GDPR setup'],
    ['feature-accessibility', 'Accessibility review'], ['feature-business-email', 'Business email setup'],
    ['feature-migration', 'Migration from an existing site'], ['feature-domain', 'Domain setup'],
    ['feature-hosting', 'Hosting deployment'], ['feature-maintenance', 'Ongoing maintenance option'],
    ['feature-cms', 'CMS / admin panel'], ['feature-map', 'Map and location'],
    ['feature-live-chat', 'Live chat integration'], ['feature-product-import', 'Product import / entry'],
    ['feature-shipping', 'Shipping methods'], ['feature-reviews', 'Ratings and reviews'],
    ['feature-security', 'Security hardening'], ['feature-backups', 'Automated backups'],
    ['feature-performance', 'Performance optimization'], ['feature-staging', 'Staging environment'],
] as const;

const platforms = ['Recommend the best option', 'WordPress', 'WooCommerce', 'Next.js', 'Shopify', 'Custom development'] as const;
const goals = ['Present a business', 'Generate enquiries', 'Sell products', 'Showcase work', 'Publish content', 'Bookings / reservations', 'Customer portal'] as const;
const styles = ['Clean and minimal', 'Corporate and professional', 'Modern and bold', 'Dark and technological', 'Editorial', 'Luxury', 'Playful and colorful'] as const;

function requirement(id: string, label: string, summary: string): ServiceRequestIssue {
    return { id, label, summary, status: 'warning' };
}

export function WebsiteOrderForm() {
    const [siteType, setSiteType] = useState('site-business');
    const [pages, setPages] = useState('pages-4-7');
    const [design, setDesign] = useState('design-custom');
    const [selectedFeatures, setSelectedFeatures] = useState(() => new Set(['feature-contact', 'feature-seo', 'feature-domain', 'feature-hosting']));
    const [priority, setPriority] = useState(false);
    const [platform, setPlatform] = useState<string>(platforms[0]);
    const [goal, setGoal] = useState<string>(goals[0]);
    const [style, setStyle] = useState<string>(styles[0]);
    const [contentReady, setContentReady] = useState('Most content is ready');
    const [brandReady, setBrandReady] = useState('Logo and colors are ready');
    const [domainValue, setDomainValue] = useState('');
    const [hasDomainAndHosting, setHasDomainAndHosting] = useState(false);
    const [domainLoading, setDomainLoading] = useState(false);
    const [domainResult, setDomainResult] = useState<{ status: string; message: string; domain?: string; suggestions?: string[] } | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [reference, setReference] = useState('');
    const [statusUrl, setStatusUrl] = useState('');
    const [startedAt] = useState(() => Date.now());

    const requirements = useMemo(() => {
        const rows: ServiceRequestIssue[] = [];
        const type = siteTypes.find(([id]) => id === siteType)!;
        const page = pageOptions.find(([id]) => id === pages)!;
        const visual = designOptions.find(([id]) => id === design)!;
        rows.push(requirement(type[0], type[1], type[2]));
        rows.push(requirement(page[0], 'Page range', page[1]));
        rows.push(requirement(visual[0], 'Design direction', visual[1]));
        rows.push(requirement('project-goal', 'Primary goal', goal));
        rows.push(requirement('visual-style', 'Preferred style', style));
        rows.push(requirement('platform', 'Platform / CMS', platform));
        rows.push(requirement('content-status', 'Content readiness', contentReady));
        rows.push(requirement('brand-assets', 'Brand assets', brandReady));
        if (hasDomainAndHosting) rows.push(requirement('existing-infrastructure', 'Domain and hosting', 'Already available'));
        for (const [id, label] of features) if (selectedFeatures.has(id)) rows.push(requirement(id, label, 'Included in the requested scope'));
        if (platform === 'Custom development') rows.push(requirement('platform-custom', 'Custom development', 'Custom technology implementation requested'));
        if (contentReady === 'Content needs preparation') rows.push(requirement('content-not-ready', 'Content preparation', 'Website content still needs preparation'));
        if (brandReady === 'Brand identity needs work') rows.push(requirement('brand-not-ready', 'Brand identity support', 'Logo, colors or visual identity need preparation'));
        if (priority) rows.push(requirement('deadline-priority', 'Priority delivery', 'Requested accelerated delivery, subject to availability'));
        return rows;
    }, [brandReady, contentReady, design, goal, hasDomainAndHosting, pages, platform, priority, selectedFeatures, siteType, style]);
    const estimate = estimateServiceRange('WEBSITE_BUILD', requirements, { cms: 'Unknown', accessStatus: 'Need guidance' });

    function toggleFeature(id: string) {
        setSelectedFeatures((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    }

    function toggleExistingInfrastructure(checked: boolean) {
        setHasDomainAndHosting(checked);
        setDomainResult(null);
        if (checked) setDomainValue('');
        setSelectedFeatures((current) => {
            const next = new Set(current);
            if (checked) { next.delete('feature-domain'); next.delete('feature-hosting'); }
            else { next.add('feature-domain'); next.add('feature-hosting'); }
            return next;
        });
    }

    async function checkDomain() {
        if (domainLoading || domainValue.trim().length < 3) return;
        setDomainLoading(true); setDomainResult(null);
        try {
            const response = await fetch('/api/domain-availability', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: domainValue }) });
            const payload = await response.json().catch(() => ({})) as { status?: string; message?: string; domain?: string; suggestions?: string[]; error?: string };
            if (!response.ok) throw new Error(payload.error || 'Domain check failed.');
            setDomainResult({ status: payload.status || 'unknown', message: payload.message || 'No conclusive result.', domain: payload.domain, suggestions: payload.suggestions });
            if (payload.domain) setDomainValue(payload.domain);
        } catch (error) { setDomainResult({ status: 'unknown', message: error instanceof Error ? error.message : 'Domain check failed.' }); }
        finally { setDomainLoading(false); }
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (loading) return;
        const form = new FormData(event.currentTarget);
        setLoading(true); setMessage('Creating website request...'); setReference(''); setStatusUrl('');
        try {
            const projectName = String(form.get('projectName') || '').trim();
            const desiredDomain = domainValue.trim();
            const response = await fetch('/api/service-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
                source: 'WEBSITE_BUILD', target: desiredDomain || projectName, issues: requirements,
                snapshot: { projectType: siteType, pages, design, features: [...selectedFeatures], priority, platform, goal, style, contentReady, brandReady, hasDomainAndHosting, audience: form.get('audience'), competitorExamples: form.get('competitorExamples'), requiredPages: form.get('requiredPages'), existingWebsite: form.get('existingWebsite'), domainCheck: domainResult },
                name: form.get('name'), email: form.get('email'), company: form.get('company'), cms: platform, accessStatus: 'New website project',
                budget: form.get('budget'), message: form.get('message'), privacyAccepted: form.get('privacyAccepted') === 'on', website: form.get('website'), startedAt,
            }) });
            const payload = await response.json().catch(() => ({})) as { reference?: string; statusUrl?: string; confirmationEmailSent?: boolean; error?: string };
            if (!response.ok || !payload.reference) throw new Error(payload.error || 'The website request could not be created.');
            setReference(payload.reference); setStatusUrl(payload.statusUrl || '');
            setMessage(payload.confirmationEmailSent ? `Request ${payload.reference} was created and emailed to you.` : `Request ${payload.reference} was created. Save the private status link below.`);
        } catch (error) { setMessage(error instanceof Error ? error.message : 'The website request could not be created.'); }
        finally { setLoading(false); }
    }

    return <form onSubmit={submit} className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-10">
            <ChoiceSection number="01" title="Domain availability"><label className="mb-5 flex cursor-pointer items-start gap-3 border-y border-border/70 py-4 text-sm"><input type="checkbox" checked={hasDomainAndHosting} onChange={(event) => toggleExistingInfrastructure(event.target.checked)} className="mt-0.5 size-4" /><span><strong>I already have a domain and hosting</strong><span className="block text-xs leading-5 text-muted-foreground">Hide the domain search and exclude domain and hosting setup from the estimate.</span></span></label>{!hasDomainAndHosting ? <div className="border-b border-border/70 pb-5"><label className="text-xs text-muted-foreground">Desired domain<div className="mt-2 flex flex-col gap-3 sm:flex-row"><input value={domainValue} onChange={(event) => { setDomainValue(event.target.value); setDomainResult(null); }} placeholder="example.com" maxLength={253} className="min-w-0 flex-1 border border-border bg-transparent px-3 py-3 text-sm text-foreground outline-none focus:border-sky-500" /><button type="button" onClick={checkDomain} disabled={domainLoading || domainValue.trim().length < 3} className="inline-flex items-center justify-center gap-2 border border-foreground px-4 py-3 text-sm font-bold transition hover:bg-foreground hover:text-background disabled:opacity-40">{domainLoading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}{domainLoading ? 'Checking...' : 'Check domain'}</button></div></label>{domainResult ? <div role="status" className={`mt-4 border-l-2 pl-3 text-xs leading-5 ${domainResult.status === 'likely_available' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : domainResult.status === 'registered' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-border text-muted-foreground'}`}><strong className="block font-mono text-[9px] uppercase tracking-[0.14em]">{domainResult.status === 'likely_available' ? 'Appears available' : domainResult.status === 'registered' ? 'Already registered' : 'Manual confirmation needed'}</strong>{domainResult.message}{domainResult.status === 'registered' && domainResult.suggestions?.length ? <div className="mt-3"><span className="block font-semibold text-foreground">Try an alternative:</span><div className="mt-2 flex flex-wrap gap-2">{domainResult.suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => { setDomainValue(suggestion); setDomainResult(null); }} className="border border-border px-2.5 py-1.5 font-mono text-[11px] text-foreground transition hover:border-sky-500 hover:text-sky-500">{suggestion}</button>)}</div></div> : null}</div> : <p className="mt-3 text-[11px] leading-5 text-muted-foreground">The check uses registry registration data. Suggested alternatives must also be checked and availability is final only when the registrar accepts the registration.</p>}</div> : null}</ChoiceSection>
            <ChoiceSection number="02" title="Website type"><div className="grid border-y border-border/70 sm:grid-cols-2">{siteTypes.map(([id, label, detail]) => <label key={id} className={`cursor-pointer border-b border-border/60 p-4 sm:border-r ${siteType === id ? 'bg-sky-500/5' : ''}`}><input type="radio" name="siteType" value={id} checked={siteType === id} onChange={() => setSiteType(id)} className="sr-only" /><span className="flex items-center justify-between text-sm font-bold">{label}{siteType === id ? <Check className="size-4 text-sky-500" /> : null}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{detail}</span></label>)}</div></ChoiceSection>
            <ChoiceSection number="03" title="Size and design"><div className="grid gap-5 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Estimated pages<select value={pages} onChange={(e) => setPages(e.target.value)} className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm text-foreground">{pageOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label className="text-xs text-muted-foreground">Design level<select value={design} onChange={(e) => setDesign(e.target.value)} className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm text-foreground">{designOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label></div></ChoiceSection>
            <ChoiceSection number="04" title="Features"><div className="grid border-y border-border/70 sm:grid-cols-2">{features.map(([id, label]) => <label key={id} className="flex cursor-pointer items-center gap-3 border-b border-border/60 py-3 sm:pr-4"><input type="checkbox" checked={selectedFeatures.has(id)} onChange={() => toggleFeature(id)} className="size-4" /><span className="text-sm">{label}</span></label>)}</div><label className="mt-5 flex items-start gap-3 text-sm"><input type="checkbox" checked={priority} onChange={(e) => setPriority(e.target.checked)} className="mt-0.5 size-4" /><span><strong>Priority delivery</strong><span className="block text-xs leading-5 text-muted-foreground">Accelerated schedule when capacity allows. Final timing is confirmed manually.</span></span></label></ChoiceSection>
            <ChoiceSection number="05" title="Purpose and direction"><div className="grid gap-5 sm:grid-cols-2"><SelectField label="Primary goal" value={goal} onChange={setGoal} options={goals} /><SelectField label="Preferred style" value={style} onChange={setStyle} options={styles} /><SelectField label="Platform / CMS" value={platform} onChange={setPlatform} options={platforms} /><Field name="audience" label="Target audience" placeholder="Who should the website reach?" /><label className="text-xs text-muted-foreground sm:col-span-2">Required pages<textarea name="requiredPages" maxLength={800} rows={3} className="mt-2 w-full border border-border bg-transparent p-3 text-sm text-foreground" placeholder="Home, About, Services, Pricing, Contact..." /></label><label className="text-xs text-muted-foreground sm:col-span-2">Examples and competitors<textarea name="competitorExamples" maxLength={1000} rows={3} className="mt-2 w-full border border-border bg-transparent p-3 text-sm text-foreground" placeholder="Links to websites you like or direct competitors" /></label></div></ChoiceSection>
            <ChoiceSection number="06" title="Content and brand assets"><div className="grid gap-5 sm:grid-cols-2"><SelectField label="Website content" value={contentReady} onChange={setContentReady} options={['All content is ready', 'Most content is ready', 'Content needs preparation']} /><SelectField label="Brand assets" value={brandReady} onChange={setBrandReady} options={['Logo and colors are ready', 'Some brand assets are ready', 'Brand identity needs work']} /><Field name="existingWebsite" label="Existing website (optional)" placeholder="https://current-site.com" /><Field name="projectName" label="Project / website name" required /></div></ChoiceSection>
            <ChoiceSection number="07" title="Contact and project details"><div className="grid gap-5 sm:grid-cols-2"><Field name="name" label="Your name" required /><Field name="email" label="Email" type="email" required /><Field name="company" label="Company (optional)" /><Field name="budget" label="Budget in EUR (optional)" type="number" /><label className="text-xs text-muted-foreground sm:col-span-2">Additional requirements<textarea name="message" maxLength={1500} rows={5} className="mt-2 w-full border border-border bg-transparent p-3 text-sm text-foreground" placeholder="Deadlines, integrations, special workflows or anything else we should know..." /></label></div><input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" /><label className="mt-5 flex items-start gap-3 text-xs leading-5 text-muted-foreground"><input name="privacyAccepted" type="checkbox" required className="mt-0.5 size-4" /><span>I agree that these project requirements and contact details may be stored to process the request.</span></label></ChoiceSection>
        </div>
        <aside className="h-fit border-y border-border/80 py-5 lg:sticky lg:top-28"><p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-sky-500">Live estimate</p><p className="mt-2 text-4xl font-black tracking-[-0.05em]">€{estimate.min}-€{estimate.max}</p><p className="mt-3 text-xs leading-5 text-muted-foreground">Indicative development range based on {requirements.length} selected requirements. Final price and delivery date follow a manual scope review.</p><div className="mt-5 border-y border-border/60">{requirements.map((item) => <div key={item.id} className="border-b border-border/50 py-2 text-xs last:border-b-0"><span className="font-semibold">{item.label}</span><span className="ml-2 text-muted-foreground">{item.summary}</span></div>)}</div><button disabled={loading} className="mt-5 inline-flex w-full items-center justify-center gap-2 border border-foreground bg-foreground px-5 py-3 text-sm font-bold text-background transition hover:bg-transparent hover:text-foreground disabled:opacity-50">{loading ? <Loader2 className="size-4 animate-spin" /> : null}{loading ? 'Creating...' : 'Create website request'}</button>{message ? <p role="status" className={`mt-4 text-xs leading-5 ${reference ? 'text-emerald-500' : 'text-muted-foreground'}`}>{message}</p> : null}{statusUrl ? <a href={statusUrl} className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-sky-500 hover:underline">Open private status page <ExternalLink className="size-3" /></a> : null}</aside>
    </form>;
}

function ChoiceSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) { return <section><p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-sky-500">{number}</p><h2 className="mb-5 mt-2 text-xl font-black tracking-tight">{title}</h2>{children}</section>; }
function Field({ name, label, type = 'text', required = false, placeholder }: { name: string; label: string; type?: string; required?: boolean; placeholder?: string }) { return <label className="text-xs text-muted-foreground">{label}<input name={name} type={type} required={required} min={type === 'number' ? 0 : undefined} max={type === 'number' ? 10000 : undefined} maxLength={type === 'number' ? undefined : 200} placeholder={placeholder} className="mt-2 w-full border-0 border-b border-border bg-transparent py-2 text-sm text-foreground outline-none focus:border-sky-500" /></label>; }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[] }) { return <label className="text-xs text-muted-foreground">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm text-foreground">{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
