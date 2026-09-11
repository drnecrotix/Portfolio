'use client';

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ExternalLink, Loader2, Send } from 'lucide-react';
import {
    estimateWebsiteProject,
    websiteProjectLabels,
    type WebsiteIntegration,
    type WebsiteProjectScope,
} from '@/modules/service-requests/website-project';

const inputClass = 'mt-2 w-full border-0 border-b border-border bg-transparent py-3 text-sm text-foreground outline-none transition focus:border-sky-500';
const selectClass = `${inputClass} bg-background`;
const integrationOrder: WebsiteIntegration[] = ['analytics', 'newsletter', 'booking', 'payments', 'crm', 'search', 'accounts', 'roles', 'custom_api'];

const initialScope: WebsiteProjectScope = {
    projectType: 'business', pages: 5, design: 'custom', cms: 'wordpress', languages: 1, content: 'ready', seo: 'basic', hosting: 'setup', deadline: 'standard', maintenance: 'none', integrations: ['analytics'],
};

export function WebsiteProjectConfigurator() {
    const [scope, setScope] = useState<WebsiteProjectScope>(initialScope);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [reference, setReference] = useState('');
    const [statusUrl, setStatusUrl] = useState('');
    const [startedAt, setStartedAt] = useState(() => Date.now());
    const estimate = useMemo(() => estimateWebsiteProject(scope), [scope]);

    function update<K extends keyof WebsiteProjectScope>(key: K, value: WebsiteProjectScope[K]) { setScope((current) => ({ ...current, [key]: value })); }
    function toggleIntegration(integration: WebsiteIntegration) { setScope((current) => ({ ...current, integrations: current.integrations.includes(integration) ? current.integrations.filter((item) => item !== integration) : [...current.integrations, integration] })); }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (loading) return;
        const form = new FormData(event.currentTarget);
        setLoading(true); setMessage('Creating website project request...'); setReference(''); setStatusUrl('');
        try {
            const projectName = String(form.get('projectName') ?? '').trim();
            const desiredDomain = String(form.get('desiredDomain') ?? '').trim();
            const response = await fetch('/api/service-requests', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source: 'WEBSITE_CREATION', target: desiredDomain || projectName, issues: [], project: scope, name: form.get('name'), email: form.get('email'), company: form.get('company'), cms: websiteProjectLabels.cms[scope.cms], accessStatus: 'New website project', budget: form.get('budget'), message: form.get('message'), privacyAccepted: form.get('privacyAccepted') === 'on', website: form.get('website'), startedAt }),
            });
            const payload = await response.json().catch(() => ({})) as { reference?: string; statusUrl?: string; confirmationEmailSent?: boolean; error?: string };
            if (!response.ok || !payload.reference) throw new Error(payload.error || 'The website project request could not be created.');
            setReference(payload.reference); setStatusUrl(payload.statusUrl || '');
            setMessage(payload.confirmationEmailSent ? `Project request ${payload.reference} was created and a confirmation email was sent.` : `Project request ${payload.reference} was created. Save the private status link below because the confirmation email could not be delivered.`);
        } catch (error) { setMessage(error instanceof Error ? error.message : 'The website project request could not be created.'); }
        finally { setLoading(false); }
    }

    return (
        <main className="min-h-screen bg-background px-5 pb-24 pt-28 text-foreground sm:px-8 lg:pt-36">
            <div className="mx-auto max-w-6xl">
                <header className="max-w-4xl border-b border-border/80 pb-7">
                    <div className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground"><span className="text-sky-500">Kreatrics</span> / Website Project / v1.3.6</div>
                    <h1 className="mt-5 text-4xl font-black tracking-[-0.055em] sm:text-5xl">Build a website project.</h1>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">Define the scope before sending the request. Pricing changes with the selected characteristics and is recalculated by the server before storage. The final scope and quote are confirmed manually.</p>
                    <a href="/services/pricing" className="mt-4 inline-block text-xs font-semibold text-sky-500 hover:underline">View current EUR service pricing</a>
                </header>

                <form onSubmit={submit}>
                    <Section code="01" title="Project type" description="Choose the closest starting point. The final scope can still be adjusted during review.">
                        <div className="grid border-y border-border/70 md:grid-cols-3">{(Object.entries(websiteProjectLabels.projectType) as Array<[WebsiteProjectScope['projectType'], string]>).map(([value, label], index) => <label key={value} className={`cursor-pointer px-4 py-4 text-sm ${index ? 'border-t border-border/50 md:border-l md:border-t-0' : ''} ${index >= 3 ? 'md:border-t md:border-border/50' : ''}`}><input type="radio" checked={scope.projectType === value} onChange={() => update('projectType', value)} className="mr-3" /><span className="font-semibold">{label}</span></label>)}</div>
                    </Section>

                    <Section code="02" title="Scope & platform" description="Pages, design depth, administration and languages are major implementation drivers.">
                        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                            <label className="text-xs text-muted-foreground">Pages<input type="number" min="1" max="40" value={scope.pages} onChange={(event) => update('pages', Math.max(1, Math.min(40, Number(event.target.value) || 1)))} className={inputClass} /></label>
                            <label className="text-xs text-muted-foreground">Design<select value={scope.design} onChange={(event) => update('design', event.target.value as WebsiteProjectScope['design'])} className={selectClass}>{Object.entries(websiteProjectLabels.design).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                            <label className="text-xs text-muted-foreground">CMS / administration<select value={scope.cms} onChange={(event) => update('cms', event.target.value as WebsiteProjectScope['cms'])} className={selectClass}>{Object.entries(websiteProjectLabels.cms).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                            <label className="text-xs text-muted-foreground">Languages<input type="number" min="1" max="6" value={scope.languages} onChange={(event) => update('languages', Math.max(1, Math.min(6, Number(event.target.value) || 1)))} className={inputClass} /></label>
                        </div>
                    </Section>

                    <Section code="03" title="Features & integrations" description="Select features that should be included in the initial delivery.">
                        <div className="border-y border-border/70">{integrationOrder.map((integration, index) => <label key={integration} className={`grid cursor-pointer gap-2 py-3 sm:grid-cols-[28px_220px_minmax(0,1fr)] ${index ? 'border-t border-border/50' : ''}`}><input type="checkbox" checked={scope.integrations.includes(integration)} onChange={() => toggleIntegration(integration)} className="mt-0.5 size-4" /><span className="text-sm font-semibold">{websiteProjectLabels.integration[integration]}</span><span className="text-xs leading-5 text-muted-foreground">{integrationDescription(integration)}</span></label>)}</div>
                    </Section>

                    <Section code="04" title="Content & delivery" description="Preparation, launch work and delivery speed affect the planning range.">
                        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
                            <label className="text-xs text-muted-foreground">Content<select value={scope.content} onChange={(event) => update('content', event.target.value as WebsiteProjectScope['content'])} className={selectClass}>{Object.entries(websiteProjectLabels.content).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                            <label className="text-xs text-muted-foreground">SEO<select value={scope.seo} onChange={(event) => update('seo', event.target.value as WebsiteProjectScope['seo'])} className={selectClass}>{Object.entries(websiteProjectLabels.seo).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                            <label className="text-xs text-muted-foreground">Hosting<select value={scope.hosting} onChange={(event) => update('hosting', event.target.value as WebsiteProjectScope['hosting'])} className={selectClass}>{Object.entries(websiteProjectLabels.hosting).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                            <label className="text-xs text-muted-foreground">Timeline<select value={scope.deadline} onChange={(event) => update('deadline', event.target.value as WebsiteProjectScope['deadline'])} className={selectClass}>{Object.entries(websiteProjectLabels.deadline).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                            <label className="text-xs text-muted-foreground">After launch<select value={scope.maintenance} onChange={(event) => update('maintenance', event.target.value as WebsiteProjectScope['maintenance'])} className={selectClass}>{Object.entries(websiteProjectLabels.maintenance).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                        </div>
                    </Section>

                    <Section code="05" title="Estimated project range" description="A deterministic planning range, not an automatically accepted quote.">
                        <div className="grid border-y border-border/80 md:grid-cols-[1fr_1fr_1.4fr]"><Metric label="Estimated range" value={`€${estimate.min}-€${estimate.max}`} /><Metric label="Indicative delivery" value={`${estimate.weeks.min}-${estimate.weeks.max} weeks`} /><div className="py-5 md:pl-6"><p className="text-xs leading-6 text-muted-foreground">The server recalculates this range. Monthly maintenance and third-party subscriptions, licences, payment-provider fees or purchased premium assets are quoted separately.</p></div></div>
                    </Section>

                    <Section code="06" title="Create project request" description="The request receives a private KT reference and uses the same Customer Service lifecycle as remediation work.">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <label className="text-xs text-muted-foreground">Your name<input name="name" required minLength={2} maxLength={80} className={inputClass} /></label><label className="text-xs text-muted-foreground">Email<input name="email" required type="email" maxLength={200} className={inputClass} /></label>
                            <label className="text-xs text-muted-foreground">Project name<input name="projectName" required minLength={3} maxLength={120} className={inputClass} placeholder="Acme website" /></label><label className="text-xs text-muted-foreground">Desired / existing domain <span className="opacity-60">optional</span><input name="desiredDomain" maxLength={2048} className={inputClass} placeholder="example.com" /></label>
                            <label className="text-xs text-muted-foreground">Company <span className="opacity-60">optional</span><input name="company" maxLength={120} className={inputClass} /></label><label className="text-xs text-muted-foreground">Budget <span className="opacity-60">optional, EUR</span><input name="budget" type="number" min="0" max="50000" step="1" className={inputClass} /></label>
                            <label className="text-xs text-muted-foreground sm:col-span-2">Notes <span className="opacity-60">optional</span><textarea name="message" rows={5} maxLength={2000} className="mt-2 w-full border border-border bg-transparent p-3 text-sm text-foreground outline-none focus:border-sky-500" placeholder="Business goals, references, brand assets or anything important for the review." /></label>
                            <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
                            <label className="flex items-start gap-3 text-xs leading-5 text-muted-foreground sm:col-span-2"><input name="privacyAccepted" type="checkbox" required className="mt-0.5 size-4" /><span>I agree that the selected project scope and contact information may be stored to prepare and manage this website project request.</span></label>
                            <div className="sm:col-span-2"><button disabled={loading} className="inline-flex items-center gap-2 border border-foreground bg-foreground px-5 py-3 text-sm font-bold text-background transition hover:bg-transparent hover:text-foreground disabled:opacity-50">{loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}{loading ? 'Creating request...' : 'Create website project request'}</button>{message ? <p role="status" className={`mt-4 text-sm ${reference ? 'text-emerald-500' : 'text-muted-foreground'}`}>{message}</p> : null}{statusUrl ? <a href={statusUrl} className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-sky-500 hover:underline">Open private project status <ExternalLink className="size-3" /></a> : null}</div>
                        </div>
                    </Section>
                </form>
            </div>
        </main>
    );
}

function Section({ code, title, description, children }: { code: string; title: string; description: string; children: ReactNode }) { return <section className="grid border-b border-border/80 py-7 lg:grid-cols-[210px_minmax(0,1fr)]"><header className="pb-5 lg:border-r lg:border-border/80 lg:pr-7"><div className="flex items-baseline gap-3"><span className="font-mono text-[9px] font-bold text-sky-500">{code}</span><h2 className="text-sm font-bold">{title}</h2></div><p className="mt-2 pl-7 text-xs leading-5 text-muted-foreground">{description}</p></header><div className="lg:pl-7">{children}</div></section>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="border-b border-border/60 py-5 md:border-b-0 md:border-r md:border-border/80 md:px-6 md:first:pl-0"><p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-black tracking-tight">{value}</p></div>; }
function integrationDescription(integration: WebsiteIntegration) { const descriptions: Record<WebsiteIntegration, string> = { analytics: 'Analytics setup and basic traffic measurement.', newsletter: 'Newsletter provider connection and subscription flow.', booking: 'Booking, appointment or reservation workflow.', payments: 'Payment-provider integration and checkout flow.', crm: 'Send leads or customer data to a CRM platform.', search: 'Site-wide structured search beyond basic filtering.', accounts: 'Registration, login and customer account area.', roles: 'Multiple authenticated roles with different permissions.', custom_api: 'Integration with a custom external or internal API.' }; return descriptions[integration]; }
