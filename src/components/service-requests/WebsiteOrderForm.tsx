'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Check, ExternalLink, Loader2 } from 'lucide-react';
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
    ['feature-copywriting', 'Copywriting support'], ['feature-domain', 'Domain setup'], ['feature-hosting', 'Hosting deployment'],
] as const;

function requirement(id: string, label: string, summary: string): ServiceRequestIssue {
    return { id, label, summary, status: 'warning' };
}

export function WebsiteOrderForm() {
    const [siteType, setSiteType] = useState('site-business');
    const [pages, setPages] = useState('pages-4-7');
    const [design, setDesign] = useState('design-custom');
    const [selectedFeatures, setSelectedFeatures] = useState(() => new Set(['feature-contact', 'feature-seo', 'feature-domain', 'feature-hosting']));
    const [priority, setPriority] = useState(false);
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
        for (const [id, label] of features) if (selectedFeatures.has(id)) rows.push(requirement(id, label, 'Included in the requested scope'));
        if (priority) rows.push(requirement('deadline-priority', 'Priority delivery', 'Requested accelerated delivery, subject to availability'));
        return rows;
    }, [design, pages, priority, selectedFeatures, siteType]);
    const estimate = estimateServiceRange('WEBSITE_BUILD', requirements, { cms: 'Unknown', accessStatus: 'Need guidance' });

    function toggleFeature(id: string) {
        setSelectedFeatures((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (loading) return;
        const form = new FormData(event.currentTarget);
        setLoading(true); setMessage('Creating website request...'); setReference(''); setStatusUrl('');
        try {
            const projectName = String(form.get('projectName') || '').trim();
            const desiredDomain = String(form.get('desiredDomain') || '').trim();
            const response = await fetch('/api/service-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
                source: 'WEBSITE_BUILD', target: desiredDomain || projectName, issues: requirements,
                snapshot: { projectType: siteType, pages, design, features: [...selectedFeatures], priority },
                name: form.get('name'), email: form.get('email'), company: form.get('company'), cms: 'To be confirmed', accessStatus: 'New website project',
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
            <ChoiceSection number="01" title="Website type"><div className="grid border-y border-border/70 sm:grid-cols-2">{siteTypes.map(([id, label, detail]) => <label key={id} className={`cursor-pointer border-b border-border/60 p-4 sm:border-r ${siteType === id ? 'bg-sky-500/5' : ''}`}><input type="radio" name="siteType" value={id} checked={siteType === id} onChange={() => setSiteType(id)} className="sr-only" /><span className="flex items-center justify-between text-sm font-bold">{label}{siteType === id ? <Check className="size-4 text-sky-500" /> : null}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{detail}</span></label>)}</div></ChoiceSection>
            <ChoiceSection number="02" title="Size and design"><div className="grid gap-5 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Estimated pages<select value={pages} onChange={(e) => setPages(e.target.value)} className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm text-foreground">{pageOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label className="text-xs text-muted-foreground">Design level<select value={design} onChange={(e) => setDesign(e.target.value)} className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm text-foreground">{designOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label></div></ChoiceSection>
            <ChoiceSection number="03" title="Features"><div className="grid border-y border-border/70 sm:grid-cols-2">{features.map(([id, label]) => <label key={id} className="flex cursor-pointer items-center gap-3 border-b border-border/60 py-3 sm:pr-4"><input type="checkbox" checked={selectedFeatures.has(id)} onChange={() => toggleFeature(id)} className="size-4" /><span className="text-sm">{label}</span></label>)}</div><label className="mt-5 flex items-start gap-3 text-sm"><input type="checkbox" checked={priority} onChange={(e) => setPriority(e.target.checked)} className="mt-0.5 size-4" /><span><strong>Priority delivery</strong><span className="block text-xs leading-5 text-muted-foreground">Accelerated schedule when capacity allows. Final timing is confirmed manually.</span></span></label></ChoiceSection>
            <ChoiceSection number="04" title="Project and contact details"><div className="grid gap-5 sm:grid-cols-2"><Field name="projectName" label="Project / website name" required /><Field name="desiredDomain" label="Desired domain" placeholder="example.com (optional)" /><Field name="name" label="Your name" required /><Field name="email" label="Email" type="email" required /><Field name="company" label="Company (optional)" /><Field name="budget" label="Budget in EUR (optional)" type="number" /><label className="text-xs text-muted-foreground sm:col-span-2">Additional requirements<textarea name="message" maxLength={1500} rows={5} className="mt-2 w-full border border-border bg-transparent p-3 text-sm text-foreground" placeholder="Audience, examples you like, required integrations, content readiness or deadline..." /></label></div><input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" /><label className="mt-5 flex items-start gap-3 text-xs leading-5 text-muted-foreground"><input name="privacyAccepted" type="checkbox" required className="mt-0.5 size-4" /><span>I agree that these project requirements and contact details may be stored to process the request.</span></label></ChoiceSection>
        </div>
        <aside className="h-fit border-y border-border/80 py-5 lg:sticky lg:top-28"><p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-sky-500">Live estimate</p><p className="mt-2 text-4xl font-black tracking-[-0.05em]">€{estimate.min}-€{estimate.max}</p><p className="mt-3 text-xs leading-5 text-muted-foreground">Indicative development range based on {requirements.length} selected requirements. Final price and delivery date follow a manual scope review.</p><div className="mt-5 border-y border-border/60">{requirements.map((item) => <div key={item.id} className="border-b border-border/50 py-2 text-xs last:border-b-0"><span className="font-semibold">{item.label}</span><span className="ml-2 text-muted-foreground">{item.summary}</span></div>)}</div><button disabled={loading} className="mt-5 inline-flex w-full items-center justify-center gap-2 border border-foreground bg-foreground px-5 py-3 text-sm font-bold text-background transition hover:bg-transparent hover:text-foreground disabled:opacity-50">{loading ? <Loader2 className="size-4 animate-spin" /> : null}{loading ? 'Creating...' : 'Create website request'}</button>{message ? <p role="status" className={`mt-4 text-xs leading-5 ${reference ? 'text-emerald-500' : 'text-muted-foreground'}`}>{message}</p> : null}{statusUrl ? <a href={statusUrl} className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-sky-500 hover:underline">Open private status page <ExternalLink className="size-3" /></a> : null}</aside>
    </form>;
}

function ChoiceSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) { return <section><p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-sky-500">{number}</p><h2 className="mb-5 mt-2 text-xl font-black tracking-tight">{title}</h2>{children}</section>; }
function Field({ name, label, type = 'text', required = false, placeholder }: { name: string; label: string; type?: string; required?: boolean; placeholder?: string }) { return <label className="text-xs text-muted-foreground">{label}<input name={name} type={type} required={required} min={type === 'number' ? 0 : undefined} max={type === 'number' ? 10000 : undefined} maxLength={type === 'number' ? undefined : 200} placeholder={placeholder} className="mt-2 w-full border-0 border-b border-border bg-transparent py-2 text-sm text-foreground outline-none focus:border-sky-500" /></label>; }
