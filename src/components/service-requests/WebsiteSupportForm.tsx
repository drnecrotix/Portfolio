'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Check, ExternalLink, Loader2 } from 'lucide-react';
import { estimateServiceRange, type ServiceRequestIssue } from '@/modules/service-requests/estimate';

const platforms = [
    ['support-wordpress', 'WordPress', 'Themes, plugins, content and core maintenance'],
    ['support-woocommerce', 'WooCommerce', 'Store, catalogue, checkout and integrations'],
    ['support-custom', 'Custom website / app', 'Frontend, backend, API, database and deployment'],
] as const;

const tasks = [
    ['support-diagnosis', 'Diagnosis and action plan'], ['support-small-fix', 'Small correction'],
    ['support-standard-fix', 'Standard repair'], ['support-complex-fix', 'Complex repair'],
    ['support-updates', 'Core / dependency updates'], ['support-backup', 'Backup setup or recovery'],
    ['support-security', 'Security hardening'], ['support-malware', 'Malware cleanup'],
    ['support-performance', 'Speed optimization'], ['support-migration', 'Hosting / server migration'],
    ['support-content', 'Content or product changes'], ['support-feature', 'New functionality'],
    ['support-api', 'API / third-party integration'], ['support-database', 'Database repair or optimization'],
    ['support-deployment', 'Deployment / CI support'],
] as const;

const planDefinitions = [
    ['wp-care', 'WordPress Care'], ['wp-business', 'WordPress Business'], ['woo-care', 'WooCommerce Care'],
    ['custom-care', 'Custom Care'], ['custom-growth', 'Custom Growth'], ['custom-priority', 'Custom Priority'],
] as const;

function requirement(id: string, label: string, summary: string): ServiceRequestIssue {
    return { id, label, summary, status: 'warning' };
}

export function WebsiteSupportForm({ supportOneOff, supportMonthly }: { supportOneOff: Record<string, { min: number; max: number }>; supportMonthly: Record<string, number> }) {
    const plans = useMemo(() => ['No monthly plan', ...planDefinitions.map(([id, name]) => `${name} - €${supportMonthly[id]}/mo`)], [supportMonthly]);
    const [platform, setPlatform] = useState('support-wordpress');
    const [selectedTasks, setSelectedTasks] = useState(() => new Set(['support-diagnosis']));
    const [plan, setPlan] = useState<string>(plans[0]);
    const [urgent, setUrgent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [reference, setReference] = useState('');
    const [statusUrl, setStatusUrl] = useState('');
    const [startedAt] = useState(() => Date.now());

    const requirements = useMemo(() => {
        const selectedPlatform = platforms.find(([id]) => id === platform)!;
        const rows = [requirement(selectedPlatform[0], selectedPlatform[1], selectedPlatform[2])];
        for (const [id, label] of tasks) if (selectedTasks.has(id)) rows.push(requirement(id, label, 'Included in the requested support scope'));
        if (plan !== plans[0]) rows.push(requirement('support-plan', 'Preferred maintenance plan', plan));
        if (urgent) rows.push(requirement('support-urgent', 'Urgent handling', 'Priority review, subject to availability'));
        return rows;
    }, [platform, plan, selectedTasks, urgent]);
    const estimate = estimateServiceRange('WEBSITE_SUPPORT', requirements, { cms: platform, accessStatus: 'Need guidance', supportOneOff });

    function toggleTask(id: string) {
        setSelectedTasks((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (loading) return;
        const form = new FormData(event.currentTarget);
        setLoading(true); setMessage('Creating support request...'); setReference(''); setStatusUrl('');
        try {
            const target = String(form.get('websiteUrl') || '').trim();
            const response = await fetch('/api/service-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
                source: 'WEBSITE_SUPPORT', target, issues: requirements,
                snapshot: { platform, tasks: [...selectedTasks], plan, urgent, symptoms: form.get('symptoms'), hosting: form.get('hosting'), recentChanges: form.get('recentChanges') },
                name: form.get('name'), email: form.get('email'), company: form.get('company'), cms: platforms.find(([id]) => id === platform)?.[1],
                accessStatus: form.get('accessStatus'), budget: form.get('budget'), message: form.get('message'), privacyAccepted: form.get('privacyAccepted') === 'on', website: form.get('website'), startedAt,
            }) });
            const payload = await response.json().catch(() => ({})) as { reference?: string; statusUrl?: string; confirmationEmailSent?: boolean; error?: string };
            if (!response.ok || !payload.reference) throw new Error(payload.error || 'The support request could not be created.');
            setReference(payload.reference); setStatusUrl(payload.statusUrl || '');
            setMessage(payload.confirmationEmailSent ? `Request ${payload.reference} was created and emailed to you.` : `Request ${payload.reference} was created. Save the private status link below.`);
        } catch (error) { setMessage(error instanceof Error ? error.message : 'The support request could not be created.'); }
        finally { setLoading(false); }
    }

    return <form onSubmit={submit} className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-10">
            <Section number="01" title="Website platform"><div className="grid border-y border-border/70 md:grid-cols-3">{platforms.map(([id, label, detail]) => <label key={id} className={`cursor-pointer border-b border-border/60 p-4 md:border-r ${platform === id ? 'bg-cyan-500/5' : ''}`}><input type="radio" className="sr-only" checked={platform === id} onChange={() => setPlatform(id)} /><span className="flex items-center justify-between text-sm font-bold">{label}{platform === id ? <Check className="size-4 text-cyan-500" /> : null}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{detail}</span></label>)}</div></Section>
            <Section number="02" title="Required work"><div className="grid border-y border-border/70 sm:grid-cols-2">{tasks.map(([id, label]) => <label key={id} className="flex cursor-pointer items-center gap-3 border-b border-border/60 py-3 sm:pr-4"><input type="checkbox" checked={selectedTasks.has(id)} onChange={() => toggleTask(id)} className="size-4" /><span className="text-sm">{label}</span></label>)}</div></Section>
            <Section number="03" title="Maintenance option"><label className="block text-xs text-muted-foreground">Preferred monthly plan<select value={plan} onChange={(event) => setPlan(event.target.value)} className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm text-foreground">{plans.map((item) => <option key={item}>{item}</option>)}</select></label><label className="mt-5 flex items-start gap-3 text-sm"><input type="checkbox" checked={urgent} onChange={(event) => setUrgent(event.target.checked)} className="mt-0.5 size-4" /><span><strong>Urgent review</strong><span className="block text-xs leading-5 text-muted-foreground">Priority handling is confirmed manually according to availability.</span></span></label></Section>
            <Section number="04" title="Technical context"><div className="grid gap-5 sm:grid-cols-2"><Field name="websiteUrl" label="Website URL" type="url" required placeholder="https://example.com" /><Field name="hosting" label="Hosting / server (optional)" /><label className="text-xs text-muted-foreground">Access availability<select name="accessStatus" className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm text-foreground"><option>Need guidance</option><option>CMS admin access available</option><option>Hosting access available</option><option>Both available</option><option>No access yet</option></select></label><Field name="recentChanges" label="Recent changes (optional)" placeholder="Update, migration, new plugin..." /><label className="text-xs text-muted-foreground sm:col-span-2">Problem or desired result<textarea name="symptoms" required maxLength={1200} rows={5} className="mt-2 w-full border border-border bg-transparent p-3 text-sm text-foreground" placeholder="What is not working, when it started, and what should happen instead?" /></label></div></Section>
            <Section number="05" title="Contact details"><div className="grid gap-5 sm:grid-cols-2"><Field name="name" label="Your name" required /><Field name="email" label="Email" type="email" required /><Field name="company" label="Company / project (optional)" /><Field name="budget" label="Budget in EUR (optional)" type="number" /><label className="text-xs text-muted-foreground sm:col-span-2">Additional notes<textarea name="message" maxLength={1500} rows={4} className="mt-2 w-full border border-border bg-transparent p-3 text-sm text-foreground" /></label></div><input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" /><label className="mt-5 flex items-start gap-3 text-xs leading-5 text-muted-foreground"><input name="privacyAccepted" type="checkbox" required className="mt-0.5 size-4" /><span>I agree that these technical and contact details may be stored to process the request.</span></label></Section>
        </div>
        <aside className="h-fit border-y border-border/80 py-5 lg:sticky lg:top-28"><p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-500">One-off estimate</p><p className="mt-2 text-4xl font-black tracking-[-0.05em]">€{estimate.min}-€{estimate.max}</p><p className="mt-3 text-xs leading-5 text-muted-foreground">Indicative range for the selected tasks. A monthly plan is billed at its published fixed price and is not added to this one-off estimate.</p><div className="mt-5 border-y border-border/60">{requirements.map((item) => <div key={item.id} className="border-b border-border/50 py-2 text-xs last:border-b-0"><span className="font-semibold">{item.label}</span><span className="ml-2 text-muted-foreground">{item.summary}</span></div>)}</div><button disabled={loading} className="mt-5 inline-flex w-full items-center justify-center gap-2 border border-foreground bg-foreground px-5 py-3 text-sm font-bold text-background transition hover:bg-transparent hover:text-foreground disabled:opacity-50">{loading ? <Loader2 className="size-4 animate-spin" /> : null}{loading ? 'Creating...' : 'Create support request'}</button>{message ? <p role="status" className={`mt-4 text-xs leading-5 ${reference ? 'text-emerald-500' : 'text-muted-foreground'}`}>{message}</p> : null}{statusUrl ? <a href={statusUrl} className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-cyan-500 hover:underline">Open private status page <ExternalLink className="size-3" /></a> : null}</aside>
    </form>;
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) { return <section><p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-500">{number}</p><h2 className="mb-5 mt-2 text-xl font-black tracking-tight">{title}</h2>{children}</section>; }
function Field({ name, label, type = 'text', required = false, placeholder }: { name: string; label: string; type?: string; required?: boolean; placeholder?: string }) { return <label className="text-xs text-muted-foreground">{label}<input name={name} type={type} required={required} min={type === 'number' ? 0 : undefined} max={type === 'number' ? 10000 : undefined} maxLength={type === 'number' ? undefined : 300} placeholder={placeholder} className="mt-2 w-full border-0 border-b border-border bg-transparent py-2 text-sm text-foreground outline-none focus:border-cyan-500" /></label>; }
