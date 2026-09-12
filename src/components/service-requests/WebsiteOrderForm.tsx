'use client';

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, ExternalLink, Lightbulb, Loader2, Search } from 'lucide-react';
import { estimateServiceRange, type ServiceRequestIssue } from '@/modules/service-requests/estimate';

const siteTypes = [
    ['site-landing', 'Landing page', 'One focused campaign or conversion page'],
    ['site-portfolio', 'Portfolio / personal brand', 'Projects, profile, services and contact'],
    ['site-business', 'Business / services', 'Company information, services and enquiries'],
    ['site-blog', 'Blog / news / magazine', 'Articles, authors, categories and editorial workflow'],
    ['site-store', 'Online store / marketplace', 'Products, cart, checkout and fulfilment'],
    ['site-community', 'Gaming / community', 'News, guides, profiles, membership and integrations'],
    ['site-recipes', 'Recipes / lifestyle', 'Structured recipes, filters, nutrition and collections'],
    ['site-knowledge', 'Wiki / knowledge base', 'Searchable documentation, guides or support content'],
    ['site-courses', 'Courses / membership', 'Protected content, lessons, progress and subscriptions'],
    ['site-booking', 'Bookings / events', 'Availability, reservations, tickets or appointments'],
    ['site-directory', 'Directory / listings', 'Searchable listings, profiles, filters and submissions'],
    ['site-custom', 'Custom platform / web app', 'Portal, workflow, SaaS product or custom data model'],
] as const;

const pageOptions = [['pages-1-3', '1-3 pages'], ['pages-4-7', '4-7 pages'], ['pages-8-15', '8-15 pages'], ['pages-16-plus', '16+ pages']] as const;
const designOptions = [['design-adapted', 'Adapted design'], ['design-custom', 'Custom design'], ['design-premium', 'Advanced motion / art direction']] as const;

const features = [
    ['feature-contact', 'Contact / enquiry forms'], ['feature-blog', 'Blog and editorial tools'],
    ['feature-bilingual', 'Multiple languages'], ['feature-booking', 'Booking / appointments'],
    ['feature-commerce', 'Catalogue and cart'], ['feature-payments', 'Online payments / subscriptions'],
    ['feature-accounts', 'Accounts and member profiles'], ['feature-integrations', 'External API / CRM / Discord'],
    ['feature-seo', 'Technical SEO foundation'], ['feature-content-entry', 'Content entry / migration'],
    ['feature-copywriting', 'Copywriting support'], ['feature-search', 'Advanced site search'],
    ['feature-newsletter', 'Newsletter integration'], ['feature-social', 'Social media sharing / feeds'],
    ['feature-analytics', 'Analytics and conversion tracking'], ['feature-cookie-consent', 'Cookie consent / GDPR'],
    ['feature-accessibility', 'Accessibility review'], ['feature-business-email', 'Business email setup'],
    ['feature-migration', 'Migration from an existing site'], ['feature-domain', 'Domain setup'],
    ['feature-hosting', 'Hosting deployment'], ['feature-maintenance', 'Ongoing maintenance'],
    ['feature-cms', 'CMS / admin panel'], ['feature-map', 'Map and location'],
    ['feature-live-chat', 'Live chat integration'], ['feature-product-import', 'Bulk product / content import'],
    ['feature-shipping', 'Shipping methods'], ['feature-reviews', 'Ratings, reviews and comments'],
    ['feature-security', 'Security hardening'], ['feature-backups', 'Automated backups'],
    ['feature-performance', 'Performance optimization'], ['feature-staging', 'Staging environment'],
    ['feature-recipes', 'Recipe cards and structured data'], ['feature-filters', 'Filters and faceted navigation'],
    ['feature-community', 'Forums / community area'], ['feature-discord', 'Discord login or server integration'],
    ['feature-events', 'Events and ticketing'], ['feature-lms', 'Lessons, quizzes and progress'],
    ['feature-directory', 'Listings and user submissions'], ['feature-wiki', 'Wiki / documentation workflow'],
    ['feature-moderation', 'Roles and moderation tools'], ['feature-notifications', 'Email / push notifications'],
] as const;

type ProjectState = 'new' | 'existing';
type FeatureId = typeof features[number][0];
type Recommendation = { title: string; platform: string; siteType?: string; reason: string; alternatives: string[]; features: FeatureId[] };

const platforms = [
    'Recommend the best option', 'WordPress', 'WooCommerce', 'Shopify', 'Ghost', 'Drupal', 'Joomla',
    'Webflow', 'Framer', 'Discourse', 'Next.js', 'Strapi', 'Sanity', 'Directus', 'Custom CMS / development', 'Other / not sure',
] as const;
const goals = [
    'Present a business', 'Generate enquiries', 'Sell products', 'Publish a blog or magazine', 'Build a gaming community',
    'Publish recipes or lifestyle content', 'Create a wiki or knowledge base', 'Sell courses or memberships',
    'Manage bookings or events', 'Create a directory or listings site', 'Showcase work', 'Build a customer portal or custom workflow',
] as const;
const styles = ['Clean and minimal', 'Corporate and professional', 'Modern and bold', 'Dark and technological', 'Editorial', 'Luxury', 'Playful and colorful'] as const;

const recommendations: Record<string, Recommendation> = {
    'Present a business': { title: 'WordPress business website', platform: 'WordPress', siteType: 'site-business', reason: 'Easy editing, mature SEO tools and a sensible cost for service pages.', alternatives: ['Webflow', 'Joomla'], features: ['feature-contact', 'feature-seo', 'feature-map', 'feature-analytics', 'feature-cookie-consent'] },
    'Generate enquiries': { title: 'Conversion-focused WordPress site', platform: 'WordPress', siteType: 'site-landing', reason: 'A focused structure with editable landing pages and lead capture.', alternatives: ['Webflow', 'Framer'], features: ['feature-contact', 'feature-copywriting', 'feature-analytics', 'feature-live-chat', 'feature-seo'] },
    'Sell products': { title: 'WooCommerce online store', platform: 'WooCommerce', siteType: 'site-store', reason: 'Strong ownership and flexibility for content-led stores. Shopify is suitable when hosted simplicity matters more.', alternatives: ['Shopify', 'Custom CMS / development'], features: ['feature-commerce', 'feature-payments', 'feature-product-import', 'feature-shipping', 'feature-reviews', 'feature-cookie-consent'] },
    'Publish a blog or magazine': { title: 'Editorial WordPress platform', platform: 'WordPress', siteType: 'site-blog', reason: 'A mature workflow for articles, authors, categories, media and search.', alternatives: ['Ghost', 'Drupal'], features: ['feature-blog', 'feature-search', 'feature-newsletter', 'feature-seo', 'feature-social', 'feature-reviews'] },
    'Build a gaming community': { title: 'WordPress community hub', platform: 'WordPress', siteType: 'site-community', reason: 'Combines news, guides and landing pages with Discord and community integrations. Discourse can power a forum-heavy project.', alternatives: ['Discourse', 'Custom CMS / development'], features: ['feature-blog', 'feature-community', 'feature-discord', 'feature-accounts', 'feature-events', 'feature-moderation', 'feature-notifications'] },
    'Publish recipes or lifestyle content': { title: 'WordPress recipe publication', platform: 'WordPress', siteType: 'site-recipes', reason: 'Excellent recipe plugins, structured data, categories, filters and editorial tools.', alternatives: ['Ghost', 'Drupal'], features: ['feature-recipes', 'feature-blog', 'feature-search', 'feature-filters', 'feature-newsletter', 'feature-seo'] },
    'Create a wiki or knowledge base': { title: 'WordPress knowledge base', platform: 'WordPress', siteType: 'site-knowledge', reason: 'Efficient for an editable public knowledge base. Headless CMS is better for multiple channels or custom search.', alternatives: ['Drupal', 'Strapi', 'Directus'], features: ['feature-wiki', 'feature-search', 'feature-accounts', 'feature-content-entry', 'feature-seo'] },
    'Sell courses or memberships': { title: 'WordPress LMS and membership site', platform: 'WordPress', siteType: 'site-courses', reason: 'Established LMS, membership and payment integrations without building every workflow from scratch.', alternatives: ['Drupal', 'Custom CMS / development'], features: ['feature-lms', 'feature-accounts', 'feature-payments', 'feature-notifications', 'feature-community'] },
    'Manage bookings or events': { title: 'WordPress booking platform', platform: 'WordPress', siteType: 'site-booking', reason: 'Reliable appointment and event extensions with manageable administration.', alternatives: ['Webflow', 'Custom CMS / development'], features: ['feature-booking', 'feature-events', 'feature-payments', 'feature-notifications', 'feature-analytics'] },
    'Create a directory or listings site': { title: 'Custom CMS directory', platform: 'Custom CMS / development', siteType: 'site-directory', reason: 'Listings, filters, submissions and moderation benefit from a purpose-built data model.', alternatives: ['WordPress', 'Drupal', 'Directus'], features: ['feature-directory', 'feature-filters', 'feature-search', 'feature-accounts', 'feature-moderation', 'feature-map'] },
    'Showcase work': { title: 'Visual WordPress portfolio', platform: 'WordPress', siteType: 'site-portfolio', reason: 'Flexible project publishing and manageable costs. Framer is an alternative for a highly visual, compact portfolio.', alternatives: ['Framer', 'Webflow'], features: ['feature-contact', 'feature-cms', 'feature-social', 'feature-seo', 'feature-analytics'] },
    'Build a customer portal or custom workflow': { title: 'Next.js with a custom or headless CMS', platform: 'Custom CMS / development', siteType: 'site-custom', reason: 'Accounts, roles and business workflows need a tailored data model and controlled integrations.', alternatives: ['Next.js', 'Strapi', 'Sanity', 'Directus'], features: ['feature-accounts', 'feature-integrations', 'feature-security', 'feature-staging', 'feature-backups', 'feature-notifications'] },
};

function existingRecommendation(siteType: string, platform: string): Recommendation {
    const common: FeatureId[] = ['feature-security', 'feature-performance', 'feature-backups', 'feature-accessibility', 'feature-seo'];
    const byType: Record<string, FeatureId[]> = {
        'site-store': ['feature-reviews', 'feature-analytics', 'feature-cookie-consent', 'feature-product-import'],
        'site-blog': ['feature-search', 'feature-newsletter', 'feature-social', 'feature-content-entry'],
        'site-community': ['feature-discord', 'feature-moderation', 'feature-events', 'feature-notifications'],
        'site-recipes': ['feature-recipes', 'feature-filters', 'feature-search', 'feature-newsletter'],
        'site-knowledge': ['feature-wiki', 'feature-search', 'feature-content-entry'],
        'site-courses': ['feature-lms', 'feature-accounts', 'feature-payments'],
        'site-booking': ['feature-booking', 'feature-events', 'feature-notifications'],
        'site-directory': ['feature-directory', 'feature-filters', 'feature-search', 'feature-moderation'],
        'site-business': ['feature-contact', 'feature-map', 'feature-analytics'],
        'site-portfolio': ['feature-social', 'feature-contact', 'feature-content-entry'],
        'site-landing': ['feature-copywriting', 'feature-analytics', 'feature-contact'],
        'site-custom': ['feature-staging', 'feature-integrations', 'feature-maintenance'],
    };
    const cmsSpecific: FeatureId[] = ['WordPress', 'WooCommerce', 'Drupal', 'Joomla'].includes(platform)
        ? ['feature-maintenance', 'feature-staging']
        : ['Next.js', 'Strapi', 'Sanity', 'Directus', 'Custom CMS / development'].includes(platform)
            ? ['feature-staging', 'feature-integrations', 'feature-maintenance'] : ['feature-maintenance'];
    return { title: `${platform === 'Recommend the best option' ? 'CMS-aware' : platform} improvement plan`, platform, reason: 'Start with measurable technical and content improvements, then add functionality that matches the current site. Final priorities can be refined after an inspection.', alternatives: [], features: [...new Set([...common, ...(byType[siteType] ?? []), ...cmsSpecific])] };
}

const req = (id: string, label: string, summary: string): ServiceRequestIssue => ({ id, label, summary, status: 'warning' });

export function WebsiteOrderForm() {
    const [step, setStep] = useState(1);
    const [projectState, setProjectState] = useState<ProjectState>('new');
    const [siteType, setSiteType] = useState('site-business');
    const [pages, setPages] = useState('pages-4-7');
    const [design, setDesign] = useState('design-custom');
    const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(() => new Set(['feature-contact', 'feature-seo', 'feature-domain', 'feature-hosting']));
    const [platform, setPlatform] = useState<string>(platforms[0]);
    const [goal, setGoal] = useState<string>(goals[0]);
    const [style, setStyle] = useState<string>(styles[0]);
    const [contentReady, setContentReady] = useState('Most content is ready');
    const [brandReady, setBrandReady] = useState('Logo and colors are ready');
    const [hasDomain, setHasDomain] = useState(false);
    const [hasHosting, setHasHosting] = useState(false);
    const [domainValue, setDomainValue] = useState('');
    const [existingWebsite, setExistingWebsite] = useState('');
    const [audience, setAudience] = useState('');
    const [priority, setPriority] = useState(false);
    const [domainLoading, setDomainLoading] = useState(false);
    const [domainResult, setDomainResult] = useState<{ status: string; message: string; domain?: string; suggestions?: string[] } | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [reference, setReference] = useState('');
    const [statusUrl, setStatusUrl] = useState('');
    const [startedAt] = useState(() => Date.now());

    const recommendation = useMemo(() => projectState === 'new' ? recommendations[goal] : existingRecommendation(siteType, platform), [goal, platform, projectState, siteType]);
    const recommendedIds = useMemo(() => new Set(recommendation.features), [recommendation]);
    const visibleFeatures = useMemo(() => features.filter(([id]) => !(id === 'feature-domain' && (hasDomain || projectState === 'existing')) && !(id === 'feature-hosting' && hasHosting)), [hasDomain, hasHosting, projectState]);

    const requirements = useMemo(() => {
        const type = siteTypes.find(([id]) => id === siteType)!;
        const rows = [req(projectState === 'new' ? 'new-site-project' : 'existing-site-project', 'Starting point', projectState === 'new' ? 'New website' : 'Existing website improvement'), req(type[0], type[1], type[2]), req(pages, 'Page range', pageOptions.find(([id]) => id === pages)?.[1] ?? pages), req(design, 'Design direction', designOptions.find(([id]) => id === design)?.[1] ?? design), req('visual-style', 'Preferred style', style), req('platform', 'CMS / technology', platform), req('content-status', 'Content readiness', contentReady), req('brand-assets', 'Brand assets', brandReady)];
        if (hasDomain || projectState === 'existing') rows.push(req('existing-domain', 'Domain', 'Already available'));
        if (hasHosting) rows.push(req('existing-hosting', 'Hosting', 'Already available'));
        const visibleIds = new Set(visibleFeatures.map(([id]) => id));
        for (const [id, label] of features) if (selectedFeatures.has(id) && visibleIds.has(id)) rows.push(req(id, label, 'Included in the requested scope'));
        if (platform === 'Custom CMS / development') rows.push(req('platform-custom', 'Custom development', 'Custom technology implementation requested'));
        if (contentReady === 'Content needs preparation') rows.push(req('content-not-ready', 'Content preparation', 'Website content needs preparation'));
        if (brandReady === 'Brand identity needs work') rows.push(req('brand-not-ready', 'Brand identity support', 'Logo, colors or visual identity need preparation'));
        if (priority) rows.push(req('deadline-priority', 'Priority delivery', 'Accelerated delivery requested'));
        return rows;
    }, [brandReady, contentReady, design, hasDomain, hasHosting, pages, platform, priority, projectState, selectedFeatures, siteType, style, visibleFeatures]);
    const estimate = estimateServiceRange('WEBSITE_BUILD', requirements, { cms: platform, accessStatus: projectState === 'existing' ? 'Need guidance' : 'New website project' });

    function setInfrastructure(kind: 'domain' | 'hosting', checked: boolean) {
        if (kind === 'domain') { setHasDomain(checked); setDomainResult(null); if (checked) setDomainValue(''); } else setHasHosting(checked);
        const id = kind === 'domain' ? 'feature-domain' : 'feature-hosting';
        setSelectedFeatures((current) => { const next = new Set(current); if (checked) next.delete(id); else next.add(id); return next; });
    }
    function selectProjectState(next: ProjectState) {
        setProjectState(next);
        if (next === 'existing') setInfrastructure('domain', true);
    }
    function toggleFeature(id: string) { setSelectedFeatures((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
    function applyRecommendation() {
        setSelectedFeatures((current) => new Set([...current, ...recommendation.features]));
    }
    function selectGoal(nextGoal: string) {
        setGoal(nextGoal);
        setSiteType(recommendations[nextGoal].siteType ?? 'site-business');
    }
    async function checkDomain() {
        if (domainLoading || domainValue.trim().length < 3) return;
        setDomainLoading(true); setDomainResult(null);
        try {
            const response = await fetch('/api/domain-availability', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: domainValue }) });
            const data = await response.json().catch(() => ({})) as { status?: string; message?: string; domain?: string; suggestions?: string[]; error?: string };
            if (!response.ok) throw new Error(data.error || 'Domain check failed.');
            setDomainResult({ status: data.status || 'unknown', message: data.message || 'No conclusive result.', domain: data.domain, suggestions: data.suggestions });
            if (data.domain) setDomainValue(data.domain);
        } catch (error) { setDomainResult({ status: 'unknown', message: error instanceof Error ? error.message : 'Domain check failed.' }); } finally { setDomainLoading(false); }
    }
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault(); if (loading) return;
        const form = new FormData(event.currentTarget);
        setLoading(true); setMessage('Creating website request...'); setReference(''); setStatusUrl('');
        try {
            const projectName = String(form.get('projectName') || '').trim();
            const response = await fetch('/api/service-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'WEBSITE_BUILD', target: existingWebsite.trim() || domainValue.trim() || projectName, issues: requirements, snapshot: { projectState, projectType: siteType, pages, design, features: [...selectedFeatures], priority, platform, goal, style, contentReady, brandReady, hasDomain, hasHosting, recommendation, audience, requiredPages: form.get('requiredPages'), existingWebsite, domainCheck: domainResult }, name: form.get('name'), email: form.get('email'), company: form.get('company'), cms: platform, accessStatus: projectState === 'existing' ? 'Existing website - access to be confirmed' : 'New website project', budget: form.get('budget'), message: form.get('message'), privacyAccepted: form.get('privacyAccepted') === 'on', website: form.get('website'), startedAt }) });
            const data = await response.json().catch(() => ({})) as { reference?: string; statusUrl?: string; confirmationEmailSent?: boolean; error?: string };
            if (!response.ok || !data.reference) throw new Error(data.error || 'The website request could not be created.');
            setReference(data.reference); setStatusUrl(data.statusUrl || ''); setMessage(data.confirmationEmailSent ? `Request ${data.reference} was created and emailed to you.` : `Request ${data.reference} was created. Save the private status link below.`);
        } catch (error) { setMessage(error instanceof Error ? error.message : 'The website request could not be created.'); } finally { setLoading(false); }
    }

    return <form onSubmit={submit} className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
            <nav aria-label="Website request progress" className="mb-10 grid grid-cols-4 border-y border-border/70">
                {['Project', 'Setup', 'Options', 'Contact'].map((label, index) => { const number = index + 1; return <button key={label} type="button" onClick={() => number < step && setStep(number)} disabled={number > step} className={`border-r border-border/60 px-2 py-3 text-left last:border-r-0 ${number === step ? 'bg-sky-500/[0.07] text-foreground' : 'text-muted-foreground'}`}><span className="block font-mono text-[8px] font-bold text-sky-500">0{number}</span><span className="mt-1 block text-[10px] font-bold sm:text-xs">{label}</span></button>; })}
            </nav>

            {step === 1 ? <div className="space-y-8">
                <Section number="01" title="What do you need?"><div className="grid border-y border-border/70 sm:grid-cols-2"><Card active={projectState === 'new'} title="A new website" detail="Get a suitable CMS and feature recommendation." onClick={() => selectProjectState('new')} /><Card active={projectState === 'existing'} title="Improve my website" detail="Get suggestions for the current site and CMS." onClick={() => selectProjectState('existing')} /></div></Section>
                <Section number="02" title={projectState === 'new' ? 'What is its main purpose?' : 'Tell us about the current website'}>{projectState === 'new' ? <div className="grid gap-5 sm:grid-cols-2"><Select label="Purpose" value={goal} onChange={selectGoal} options={goals} /><label className="text-xs text-muted-foreground">Audience (optional)<input value={audience} onChange={(event) => setAudience(event.target.value)} placeholder="Who is it for?" className="mt-2 w-full border-0 border-b border-border bg-transparent py-2 text-sm text-foreground outline-none focus:border-sky-500" /></label></div> : <div className="space-y-6"><label className="block text-xs text-muted-foreground">Website URL<input value={existingWebsite} onChange={(event) => setExistingWebsite(event.target.value)} type="url" placeholder="https://example.com" className="mt-2 w-full border border-border bg-transparent px-4 py-3 text-sm text-foreground outline-none transition focus:border-sky-500" /></label><div><p className="mb-3 text-xs text-muted-foreground">Website category</p><SiteTypeChoices value={siteType} onChange={setSiteType} /></div><div><p className="mb-3 text-xs text-muted-foreground">What is it built with?</p><CmsChoices value={platform} onChange={setPlatform} /></div></div>}</Section>
                <WizardNext onClick={() => setStep(2)} disabled={projectState === 'existing' && existingWebsite.trim().length < 6} />
            </div> : null}

            {step === 2 ? <div className="space-y-8">
                <Section number="01" title="Recommended starting point"><div className="border border-sky-500/30 bg-sky-500/[0.05] p-5"><div className="flex gap-3"><Lightbulb className="mt-0.5 size-5 shrink-0 text-sky-500" /><div><p className="font-bold">{recommendation.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{recommendation.reason}</p></div></div>{projectState === 'new' ? <div className="mt-4"><p className="mb-2 font-mono text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Choose a platform</p><div className="flex flex-wrap gap-2">{[recommendation.platform, ...recommendation.alternatives].map((option) => <button key={option} type="button" onClick={() => setPlatform(option)} className={`border px-3 py-2 text-xs font-bold transition ${platform === option ? 'border-sky-500 bg-sky-500 text-white' : 'border-border bg-background hover:border-foreground'}`}>{option}</button>)}</div><button type="button" onClick={applyRecommendation} className="mt-4 text-xs font-bold text-sky-500 hover:underline">Add suggested functions to the estimate</button></div> : <button type="button" onClick={applyRecommendation} className="mt-4 border border-foreground px-4 py-2 text-xs font-bold transition hover:bg-foreground hover:text-background">Add suggested improvements</button>}</div></Section>
                <Section number="02" title="Domain and hosting"><div className="grid gap-3 sm:grid-cols-2"><Toggle checked={hasDomain || projectState === 'existing'} disabled={projectState === 'existing'} title="I have a domain" detail="No domain setup needed." onChange={(checked) => setInfrastructure('domain', checked)} /><Toggle checked={hasHosting} title="I have hosting" detail="No hosting setup needed." onChange={(checked) => setInfrastructure('hosting', checked)} /></div>{!hasDomain && projectState === 'new' ? <DomainCheck value={domainValue} onValue={setDomainValue} loading={domainLoading} result={domainResult} onCheck={checkDomain} /> : null}</Section>
                <WizardNav back={() => setStep(1)} next={() => setStep(3)} />
            </div> : null}

            {step === 3 ? <div className="space-y-8">
                <Section number="01" title="Project size"><div className="space-y-6"><div><p className="mb-3 text-xs text-muted-foreground">Approximate number of pages</p><ChoiceButtons value={pages} onChange={setPages} options={pageOptions} /></div><div className="border-l-2 border-sky-500 pl-3 text-xs"><p><span className="text-muted-foreground">Website:</span> <strong>{siteTypes.find(([id]) => id === siteType)?.[1]}</strong></p><p className="mt-1"><span className="text-muted-foreground">Platform:</span> <strong>{platform}</strong>{projectState === 'new' ? <button type="button" onClick={() => setStep(2)} className="ml-3 text-sky-500 hover:underline">Change</button> : null}</p></div></div></Section>
                <details className="border-y border-border/70 py-5"><summary className="cursor-pointer text-sm font-bold">Advanced options <span className="ml-2 text-xs font-normal text-muted-foreground">design, content and add-ons</span></summary><div className="mt-6 space-y-7"><div className="grid gap-5 sm:grid-cols-2"><TupleSelect label="Design level" value={design} onChange={setDesign} options={designOptions} /><Select label="Visual style" value={style} onChange={setStyle} options={styles} /><Select label="Content" value={contentReady} onChange={setContentReady} options={['All content is ready', 'Most content is ready', 'Content needs preparation']} /><Select label="Brand assets" value={brandReady} onChange={setBrandReady} options={['Logo and colors are ready', 'Some brand assets are ready', 'Brand identity needs work']} /></div><div><p className="mb-3 text-xs font-bold">Functions and add-ons</p><div className="grid max-h-80 overflow-y-auto border-y border-border/70 sm:grid-cols-2">{visibleFeatures.map(([id, label]) => <label key={id} className={`flex cursor-pointer items-center gap-3 border-b border-border/60 py-3 sm:pr-4 ${recommendedIds.has(id) ? 'text-sky-600 dark:text-sky-400' : ''}`}><input type="checkbox" checked={selectedFeatures.has(id)} onChange={() => toggleFeature(id)} className="size-4" /><span className="text-xs">{label}{recommendedIds.has(id) ? <span className="ml-2 font-mono text-[7px] uppercase">suggested</span> : null}</span></label>)}</div></div><label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={priority} onChange={(event) => setPriority(event.target.checked)} className="mt-0.5 size-4" /><span><strong>Priority delivery</strong><span className="block text-xs text-muted-foreground">Subject to availability.</span></span></label></div></details>
                <WizardNav back={() => setStep(2)} next={() => setStep(4)} />
            </div> : null}

            {step === 4 ? <div className="space-y-8"><Section number="01" title="Project and contact details"><div className="grid gap-5 sm:grid-cols-2"><Field name="projectName" label="Project name" required /><Field name="name" label="Your name" required /><Field name="email" label="Email" type="email" required /><Field name="budget" label="Budget in EUR (optional)" type="number" /><TextArea name="requiredPages" label="What is most important?" placeholder="Key pages, functions or improvements..." /><TextArea name="message" label="Anything else? (optional)" placeholder="Deadline, examples or special requirements..." rows={4} /></div><input name="company" className="hidden" tabIndex={-1} /><input name="competitorExamples" className="hidden" tabIndex={-1} /><input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" /><label className="mt-5 flex items-start gap-3 text-xs leading-5 text-muted-foreground"><input name="privacyAccepted" type="checkbox" required className="mt-0.5 size-4" />I agree that these details may be stored to process the request.</label></Section><div className="flex justify-start"><button type="button" onClick={() => setStep(3)} className="inline-flex items-center gap-2 px-1 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" />Back</button></div></div> : null}
        </div>
        <aside className="h-fit border-y border-border/80 py-5 lg:sticky lg:top-28"><p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-sky-500">Estimated range</p><p className="mt-2 text-4xl font-black tracking-[-0.05em]">€{estimate.min}-€{estimate.max}</p><p className="mt-3 text-xs leading-5 text-muted-foreground">Updated from your choices. Final price follows a manual review.</p><div className="mt-5 border-y border-border/60 py-3 text-xs"><p><strong>{siteTypes.find(([id]) => id === siteType)?.[1]}</strong></p><p className="mt-1 text-muted-foreground">{platform}</p><p className="mt-1 text-muted-foreground">{selectedFeatures.size} selected add-ons</p></div>{step === 4 ? <button disabled={loading} className="mt-5 inline-flex w-full items-center justify-center gap-2 border border-foreground bg-foreground px-5 py-3 text-sm font-bold text-background transition hover:bg-transparent hover:text-foreground disabled:opacity-50">{loading ? <Loader2 className="size-4 animate-spin" /> : null}{loading ? 'Creating...' : 'Create request'}</button> : <button type="button" disabled={step === 1 && projectState === 'existing' && existingWebsite.trim().length < 6} onClick={() => setStep(Math.min(4, step + 1))} className="mt-5 inline-flex w-full items-center justify-center gap-2 border border-foreground px-5 py-3 text-sm font-bold transition hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-40">Continue <ArrowRight className="size-4" /></button>}{message ? <p role="status" className={`mt-4 text-xs leading-5 ${reference ? 'text-emerald-500' : 'text-muted-foreground'}`}>{message}</p> : null}{statusUrl ? <a href={statusUrl} className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-sky-500 hover:underline">Open private status page <ExternalLink className="size-3" /></a> : null}</aside>
    </form>;
}

function DomainCheck({ value, onValue, loading, result, onCheck }: { value: string; onValue: (value: string) => void; loading: boolean; result: { status: string; message: string; suggestions?: string[] } | null; onCheck: () => void }) { return <div className="mt-5 border-b border-border/70 pb-5"><label className="text-xs text-muted-foreground">Desired domain<div className="mt-2 flex flex-col gap-3 sm:flex-row"><input value={value} onChange={(event) => onValue(event.target.value)} placeholder="example.com" maxLength={253} className="min-w-0 flex-1 border border-border bg-transparent px-3 py-3 text-sm text-foreground" /><button type="button" onClick={onCheck} disabled={loading || value.trim().length < 3} className="inline-flex items-center justify-center gap-2 border border-foreground px-4 py-3 text-sm font-bold disabled:opacity-40">{loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}{loading ? 'Checking...' : 'Check domain'}</button></div></label>{result ? <div role="status" className={`mt-4 border-l-2 pl-3 text-xs leading-5 ${result.status === 'likely_available' ? 'border-emerald-500 text-emerald-500' : result.status === 'registered' ? 'border-amber-500 text-amber-500' : 'border-border text-muted-foreground'}`}><strong className="block font-mono text-[9px] uppercase">{result.status === 'likely_available' ? 'Appears available' : result.status === 'registered' ? 'Already registered' : 'Manual confirmation needed'}</strong>{result.message}{result.status === 'registered' && result.suggestions?.length ? <div className="mt-3 flex flex-wrap gap-2">{result.suggestions.map((item) => <button key={item} type="button" onClick={() => onValue(item)} className="border border-border px-2 py-1 font-mono text-[11px] text-foreground">{item}</button>)}</div> : null}</div> : null}</div>; }
function Card({ active, title, detail, onClick }: { active: boolean; title: string; detail: string; onClick: () => void }) { return <button type="button" aria-pressed={active} onClick={onClick} className={`min-h-28 border-b border-border/60 p-4 text-left transition sm:border-r ${active ? 'bg-sky-500/[0.07]' : 'hover:bg-foreground/[0.03]'}`}><span className="flex items-center justify-between text-sm font-bold">{title}{active ? <Check className="size-4 text-sky-500" /> : null}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{detail}</span></button>; }
function Toggle({ checked, disabled = false, title, detail, onChange }: { checked: boolean; disabled?: boolean; title: string; detail: string; onChange: (checked: boolean) => void }) { return <label className={`flex items-start gap-3 border border-border/70 p-4 text-sm ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 size-4" /><span><strong>{title}</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">{detail}</span></span></label>; }
function Section({ number, title, children }: { number: string; title: string; children: ReactNode }) { return <section><p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-sky-500">{number}</p><h2 className="mb-5 mt-2 text-xl font-black tracking-tight">{title}</h2>{children}</section>; }
function Field({ name, label, type = 'text', required = false, placeholder }: { name: string; label: string; type?: string; required?: boolean; placeholder?: string }) { return <label className="text-xs text-muted-foreground">{label}<input name={name} type={type} required={required} min={type === 'number' ? 0 : undefined} max={type === 'number' ? 10000 : undefined} maxLength={type === 'number' ? undefined : 200} placeholder={placeholder} className="mt-2 w-full border-0 border-b border-border bg-transparent py-2 text-sm text-foreground outline-none focus:border-sky-500" /></label>; }
function TextArea({ name, label, placeholder, rows = 3 }: { name: string; label: string; placeholder?: string; rows?: number }) { return <label className="text-xs text-muted-foreground sm:col-span-2">{label}<textarea name={name} maxLength={1500} rows={rows} className="mt-2 w-full border border-border bg-transparent p-3 text-sm text-foreground" placeholder={placeholder} /></label>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[] }) { return <label className="text-xs text-muted-foreground">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm text-foreground">{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
function TupleSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly (readonly [string, string])[] }) { return <label className="text-xs text-muted-foreground">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm text-foreground">{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>; }
function WizardNext({ onClick, disabled = false }: { onClick: () => void; disabled?: boolean }) { return <div className="flex justify-end"><button type="button" disabled={disabled} onClick={onClick} className="inline-flex items-center gap-2 border border-foreground px-5 py-3 text-sm font-bold transition hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-40">Continue <ArrowRight className="size-4" /></button></div>; }
function WizardNav({ back, next }: { back: () => void; next: () => void }) { return <div className="flex items-center justify-between"><button type="button" onClick={back} className="inline-flex items-center gap-2 px-1 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" />Back</button><WizardNext onClick={next} /></div>; }
function ChoiceButtons({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: readonly (readonly [string, string])[] }) { return <div className="flex flex-wrap gap-2">{options.map(([id, label]) => <button key={id} type="button" aria-pressed={value === id} onClick={() => onChange(id)} className={`border px-3 py-2 text-xs font-bold transition ${value === id ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground'}`}>{label}</button>)}</div>; }
function SiteTypeChoices({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <div className="flex flex-wrap gap-2">{siteTypes.map(([id, label]) => <button key={id} type="button" aria-pressed={value === id} onClick={() => onChange(id)} className={`border px-3 py-2 text-xs transition ${value === id ? 'border-foreground bg-foreground font-bold text-background' : 'border-border hover:border-foreground'}`}>{label}</button>)}</div>; }
function CmsChoices({ value, onChange }: { value: string; onChange: (value: string) => void }) { const common = ['WordPress', 'WooCommerce', 'Shopify', 'Next.js', 'Other / not sure']; const more = platforms.filter((option) => option !== 'Recommend the best option' && !common.includes(option)); return <div><div className="flex flex-wrap gap-2">{common.map((option) => <button key={option} type="button" onClick={() => onChange(option)} className={`border px-3 py-2 text-xs font-bold transition ${value === option ? 'border-sky-500 bg-sky-500 text-white' : 'border-border hover:border-foreground'}`}>{option}</button>)}</div><details className="mt-3"><summary className="cursor-pointer text-[11px] font-semibold text-sky-500">More CMS options</summary><div className="mt-3 flex flex-wrap gap-2">{more.map((option) => <button key={option} type="button" onClick={() => onChange(option)} className={`border px-3 py-2 text-xs transition ${value === option ? 'border-sky-500 bg-sky-500 text-white' : 'border-border hover:border-foreground'}`}>{option}</button>)}</div></details></div>; }
