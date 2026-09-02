import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { normalizeExperienceContent } from '@/lib/experience-content';
import { updateExperiencePage } from './actions';

const input = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/30';
const section = 'rounded-2xl border border-white/10 bg-white/[0.025] p-6';
const toggle = 'flex items-center gap-3 text-sm text-white/70';

export default async function ExperienceAdminPage() {
    const page = await prisma.page.findUnique({ where: { slug: '__experience-config' } });
    const content = normalizeExperienceContent(page?.content);

    return (
        <div className="mx-auto max-w-6xl">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">Protected visual editor</p>
                    <h2 className="mt-2 text-4xl font-semibold">Experience</h2>
                    <p className="mt-3 max-w-3xl text-sm text-white/45">Customize the complete /experience page. Every major section can be enabled or disabled without deleting its content.</p>
                </div>
                <Link href="/experience" target="_blank" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 hover:text-white">Preview page</Link>
            </div>

            <form action={updateExperiencePage} className="space-y-8">
                <section className={section}>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/35">Visibility</p>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <label className={toggle}><input type="checkbox" name="pageEnabled" defaultChecked={content.pageEnabled} className="size-4" /> Enable /experience page content</label>
                        <label className={toggle}><input type="checkbox" name="showHero" defaultChecked={content.showHero} className="size-4" /> Hero</label>
                        <label className={toggle}><input type="checkbox" name="showDecorations" defaultChecked={content.showDecorations} className="size-4" /> Background decorations</label>
                        <label className={toggle}><input type="checkbox" name="showMarquee" defaultChecked={content.showMarquee} className="size-4" /> Experience marquee</label>
                        <label className={toggle}><input type="checkbox" name="showTabs" defaultChecked={content.showTabs} className="size-4" /> Tab navigation</label>
                        <label className={toggle}><input type="checkbox" name="showEducation" defaultChecked={content.showEducation} className="size-4" /> Education tab</label>
                        <label className={toggle}><input type="checkbox" name="showJourney" defaultChecked={content.showJourney} className="size-4" /> Journey tab</label>
                        <label className={toggle}><input type="checkbox" name="showExperience" defaultChecked={content.showExperience} className="size-4" /> Experience archive tab</label>
                        <label className={toggle}><input type="checkbox" name="showHighlights" defaultChecked={content.showHighlights} className="size-4" /> Highlight blocks</label>
                        <label className={toggle}><input type="checkbox" name="showSkills" defaultChecked={content.showSkills} className="size-4" /> Skills in cards</label>
                        <label className={toggle}><input type="checkbox" name="showResponsibilities" defaultChecked={content.showResponsibilities} className="size-4" /> Responsibilities in cards</label>
                        <label className={toggle}><input type="checkbox" name="showImpact" defaultChecked={content.showImpact} className="size-4" /> Impact in cards</label>
                        <label className={toggle}><input type="checkbox" name="showKeyLearnings" defaultChecked={content.showKeyLearnings} className="size-4" /> Key learnings in cards</label>
                    </div>
                    <label className="mt-6 block text-sm text-white/60">Default tab
                        <select name="defaultTab" defaultValue={content.defaultTab} className={input}>
                            <option value="education">Education</option>
                            <option value="journey">Journey</option>
                            <option value="experience">Experience</option>
                        </select>
                    </label>
                </section>

                <section className={`${section} grid gap-5 md:grid-cols-2`}>
                    <div className="md:col-span-2"><p className="text-xs uppercase tracking-[0.25em] text-white/35">Hero</p></div>
                    <label className="text-sm text-white/60">Eyebrow<input name="heroEyebrow" defaultValue={content.heroEyebrow} className={input} /></label>
                    <label className="text-sm text-white/60">Highlighted words<input name="heroHighlight" defaultValue={content.heroHighlight} className={input} /></label>
                    <label className="text-sm text-white/60 md:col-span-2">Main title<input name="heroTitle" defaultValue={content.heroTitle} className={input} /></label>
                    <label className="text-sm text-white/60 md:col-span-2">Description<textarea name="heroDescription" defaultValue={content.heroDescription} rows={4} className={input} /></label>
                    <label className="text-sm text-white/60">Primary button label<input name="heroPrimaryLabel" defaultValue={content.heroPrimaryLabel} className={input} /></label>
                    <label className="text-sm text-white/60">Primary button URL<input name="heroPrimaryUrl" defaultValue={content.heroPrimaryUrl} className={input} /></label>
                    <label className="text-sm text-white/60">Secondary button label<input name="heroSecondaryLabel" defaultValue={content.heroSecondaryLabel} className={input} /></label>
                    <label className="text-sm text-white/60">Secondary button URL<input name="heroSecondaryUrl" defaultValue={content.heroSecondaryUrl} className={input} /></label>
                </section>

                <section className={`${section} grid gap-5 md:grid-cols-2`}>
                    <div className="md:col-span-2"><p className="text-xs uppercase tracking-[0.25em] text-white/35">Navigation & copy</p></div>
                    <label className="text-sm text-white/60">Marquee title<input name="marqueeTitle" defaultValue={content.marqueeTitle} className={input} /></label>
                    <label className="text-sm text-white/60">Tab intro<input name="tabIntro" defaultValue={content.tabIntro} className={input} /></label>
                    <label className="text-sm text-white/60">Education label<input name="educationLabel" defaultValue={content.educationLabel} className={input} /></label>
                    <label className="text-sm text-white/60">Education description<textarea name="educationDescription" defaultValue={content.educationDescription} rows={2} className={input} /></label>
                    <label className="text-sm text-white/60">Journey label<input name="journeyLabel" defaultValue={content.journeyLabel} className={input} /></label>
                    <label className="text-sm text-white/60">Journey description<textarea name="journeyDescription" defaultValue={content.journeyDescription} rows={2} className={input} /></label>
                    <label className="text-sm text-white/60">Experience label<input name="experienceLabel" defaultValue={content.experienceLabel} className={input} /></label>
                    <label className="text-sm text-white/60">Experience description<textarea name="experienceDescription" defaultValue={content.experienceDescription} rows={2} className={input} /></label>
                    <label className="text-sm text-white/60">Archive eyebrow<input name="archiveEyebrow" defaultValue={content.archiveEyebrow} className={input} /></label>
                    <label className="text-sm text-white/60">Archive title<input name="archiveTitle" defaultValue={content.archiveTitle} className={input} /></label>
                    <label className="text-sm text-white/60 md:col-span-2">Archive description<textarea name="archiveDescription" defaultValue={content.archiveDescription} rows={3} className={input} /></label>
                    <label className="text-sm text-white/60 md:col-span-2">Empty state<input name="emptyState" defaultValue={content.emptyState} className={input} /></label>
                </section>

                <section className={section}>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/35">Experience categories</p>
                    <p className="mt-2 text-sm text-white/40">Disable a category to hide it. Prefix controls which existing portfolioData experience IDs are included.</p>
                    <div className="mt-6 space-y-5">
                        {content.categories.map((category, index) => (
                            <div key={category.id} className="grid gap-4 rounded-xl border border-white/10 p-4 md:grid-cols-2">
                                <label className={`${toggle} md:col-span-2`}><input type="checkbox" name={`category_${index}_enabled`} defaultChecked={category.enabled} className="size-4" /> Show {category.label}</label>
                                <label className="text-sm text-white/60">Label<input name={`category_${index}_label`} defaultValue={category.label} className={input} /></label>
                                <label className="text-sm text-white/60">ID prefix<input name={`category_${index}_prefix`} defaultValue={category.prefix} className={input} /></label>
                                <label className="text-sm text-white/60 md:col-span-2">Description<textarea name={`category_${index}_description`} defaultValue={category.description} rows={2} className={input} /></label>
                            </div>
                        ))}
                    </div>
                </section>

                <section className={section}>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/35">Highlight blocks</p>
                    <div className="mt-6 space-y-6">
                        {(['education', 'journey', 'experience'] as const).map((id) => {
                            const item = content.highlights[id];
                            const cap = id[0].toUpperCase() + id.slice(1);
                            return (
                                <div key={id} className="grid gap-4 rounded-xl border border-white/10 p-4 md:grid-cols-2">
                                    <label className={`${toggle} md:col-span-2`}><input type="checkbox" name={`${id}HighlightEnabled`} defaultChecked={item.enabled} className="size-4" /> Show {cap} highlight</label>
                                    <label className="text-sm text-white/60">Title<input name={`${id}HighlightTitle`} defaultValue={item.title} className={input} /></label>
                                    <label className="text-sm text-white/60">Highlighted text<input name={`${id}HighlightText`} defaultValue={item.highlight} className={input} /></label>
                                    <label className="text-sm text-white/60 md:col-span-2">Description<textarea name={`${id}HighlightDescription`} defaultValue={item.description} rows={3} className={input} /></label>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <div className="sticky bottom-4 z-20 flex justify-end rounded-2xl border border-white/10 bg-black/80 p-4 backdrop-blur-xl">
                    <button className="rounded-xl bg-white px-6 py-3 font-semibold text-black">Save experience page</button>
                </div>
            </form>
        </div>
    );
}
