'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { ArrowDown, ArrowRight, Bot, Boxes, Braces, BrainCircuit, CloudCog, Database, Palette } from 'lucide-react';
import { SplineScene } from '@/components/ui/SplineScene';
import { DeferredMount } from '@/components/ui/DeferredMount';
import { portfolioData } from '@/data/portfolio';

const capabilities = [
    { id: 'product', title: 'Product & Web Engineering', copy: 'Interfaces, APIs and production web systems built around real product requirements.', icon: Braces, stack: ['Next.js', 'React', 'TypeScript', 'Node.js', 'Tailwind CSS'] },
    { id: 'data', title: 'Backend & Data Systems', copy: 'Reliable application backends, data flows and persistence for content and operational systems.', icon: Database, stack: ['PostgreSQL', 'Prisma', 'Python', 'SQL', 'REST APIs'] },
    { id: 'infra', title: 'Infrastructure & Hosting', copy: 'Deployment, hosting and service operations with an emphasis on maintainability and repeatability.', icon: CloudCog, stack: ['Docker', 'Linux', 'Cloudflare', 'GitHub Actions', 'VPS'] },
    { id: 'ai', title: 'AI & Automation', copy: 'AI-assisted workflows, agents and automation that reduce repetitive work and connect systems.', icon: BrainCircuit, stack: ['OpenAI', 'Codex', 'Python', 'Automation', 'Agents'] },
    { id: 'design', title: 'Design & Creative Technology', copy: 'UI/UX, visual systems and creative tooling used to turn technical ideas into usable experiences.', icon: Palette, stack: ['Figma', 'Canva', 'Affinity', 'Photoshop', 'UI/UX'] },
    { id: 'systems', title: 'Community & Interactive Systems', copy: 'Bots, game infrastructure and community tooling for Discord, Minecraft and connected platforms.', icon: Boxes, stack: ['Discord', 'Minecraft', 'Bots', 'Integrations', 'Moderation'] },
] as const;

const toolchain = [
    { label: 'Languages', items: ['TypeScript', 'JavaScript', 'Python', 'PHP', 'SQL'] },
    { label: 'Frontend', items: ['React', 'Next.js', 'Tailwind CSS', 'Bootstrap', 'Three.js'] },
    { label: 'Backend & Data', items: ['Node.js', 'PostgreSQL', 'Prisma', 'REST APIs', 'WordPress'] },
    { label: 'Infrastructure', items: ['Docker', 'Linux', 'Cloudflare', 'GitHub Actions', 'VPS'] },
    { label: 'Creative', items: ['Figma', 'Canva', 'Affinity', 'Photoshop', 'UI/UX'] },
    { label: 'AI & Automation', items: ['OpenAI', 'Codex', 'Claude', 'Agents', 'Automation'] },
];

type Bubble = {
    name: string;
    icon: string;
    top: string;
    left?: string;
    right?: string;
    duration: number;
};

const bubbles: Bubble[] = [
    { name: 'Python', icon: 'python', top: '14%', left: '8%', duration: 8.4 },
    { name: 'React', icon: 'react', top: '28%', left: '20%', duration: 9.2 },
    { name: 'PyTorch', icon: 'pytorch', top: '45%', left: '6%', duration: 10.1 },
    { name: 'Node.js', icon: 'nodejs', top: '62%', left: '18%', duration: 8.9 },
    { name: 'TensorFlow', icon: 'tensorflow', top: '78%', left: '10%', duration: 9.8 },
    { name: 'Next.js', icon: 'nextjs', top: '18%', right: '12%', duration: 9.4 },
    { name: 'OpenCV', icon: 'opencv', top: '35%', right: '22%', duration: 10.3 },
    { name: 'TypeScript', icon: 'typescript', top: '52%', right: '10%', duration: 8.7 },
    { name: 'Pandas', icon: 'pandas', top: '68%', right: '24%', duration: 9.7 },
    { name: 'PostgreSQL', icon: 'postgresql', top: '82%', right: '15%', duration: 10.4 },
];

function FloatingTechnology({ item, mouseX, mouseY }: { item: Bubble; mouseX: MotionValue<number>; mouseY: MotionValue<number> }) {
    const ref = useRef<HTMLButtonElement>(null);
    const reduceMotion = useReducedMotion();
    const x = useTransform(mouseX, (value) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return 0;
        const center = rect.left + rect.width / 2;
        return Math.max(-8, Math.min(8, (value - center) / 40));
    });
    const yPointer = useTransform(mouseY, (value) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return 0;
        const center = rect.top + rect.height / 2;
        return Math.max(-8, Math.min(8, (value - center) / 40));
    });

    return (
        <motion.button
            ref={ref}
            type="button"
            onClick={() => document.getElementById('toolchain')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })}
            animate={reduceMotion ? undefined : { translateY: [0, -20, 0] }}
            transition={reduceMotion ? undefined : { duration: item.duration, repeat: Infinity, ease: 'easeInOut' }}
            style={{ top: item.top, left: item.left, right: item.right, x, y: yPointer }}
            className="group absolute z-20 flex size-14 items-center justify-center rounded-full border border-white/10 bg-black/25 backdrop-blur-xl transition hover:border-white/30 hover:bg-white/10 sm:size-16 lg:size-20"
            aria-label={`Explore ${item.name}`}
        >
            <Image
                src={`https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${item.icon}/${item.icon}-original.svg`}
                alt=""
                width={42}
                height={42}
                unoptimized
                className="size-7 grayscale opacity-45 transition duration-300 group-hover:grayscale-0 group-hover:opacity-100 sm:size-8 lg:size-10"
            />
            <span className="pointer-events-none absolute top-full mt-2 whitespace-nowrap rounded-md border border-white/10 bg-black/80 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-white/70 opacity-0 transition group-hover:opacity-100">{item.name}</span>
        </motion.button>
    );
}

export function LabPageClient() {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const reduceMotion = useReducedMotion();
    const { scrollY } = useScroll();
    const robotY = useTransform(scrollY, [0, 900], [0, 150]);
    const heroY = useTransform(scrollY, [0, 700], [0, 220]);
    const heroOpacity = useTransform(scrollY, [0, 560], [1, 0]);

    const proof = useMemo(() => {
        const counts = new Map<string, { projects: number; examples: string[] }>();
        for (const project of portfolioData.projects) {
            for (const technology of [...project.techStack, ...project.tools]) {
                const current = counts.get(technology) ?? { projects: 0, examples: [] };
                current.projects += 1;
                if (current.examples.length < 2) current.examples.push(project.title);
                counts.set(technology, current);
            }
        }
        return [...counts.entries()].sort((a, b) => b[1].projects - a[1].projects).slice(0, 6);
    }, []);

    return (
        <main className="min-h-screen overflow-hidden bg-background text-foreground" onMouseMove={(event) => { mouseX.set(event.clientX); mouseY.set(event.clientY); }}>
            <section className="relative flex min-h-screen items-end justify-center overflow-hidden pb-16 pt-24">
                <motion.div className="absolute inset-0" style={{ y: robotY }}>
                    <DeferredMount fallback={<div className="h-full w-full bg-zinc-950" />}>
                        <SplineScene scene="https://prod.spline.design/qVnpleqGGhqRlQYK/scene.splinecode" className="h-full w-full opacity-70 md:opacity-100" />
                    </DeferredMount>
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-background/30 to-background" />
                </motion.div>

                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.07),transparent_35%)]" />
                {bubbles.map((item) => <FloatingTechnology key={item.name} item={item} mouseX={mouseX} mouseY={mouseY} />)}

                <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-6 text-center">
                    <p className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.45em] text-muted-foreground">Code · Design · Systems · AI</p>
                    <h1 className="text-[16vw] font-black uppercase leading-[0.78] tracking-[-0.075em] text-zinc-300 sm:text-[13vw] lg:text-[10vw] dark:text-zinc-300">The Lab</h1>
                    <p className="mt-7 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">Technologies, systems and tools behind what I build - organized by capability, not arbitrary proficiency percentages.</p>
                    <button type="button" onClick={() => document.getElementById('capabilities')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })} className="mt-8 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/50 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] backdrop-blur transition hover:bg-foreground hover:text-background">
                        Explore the lab <ArrowDown className="size-4" />
                    </button>
                </motion.div>
            </section>

            <section id="capabilities" className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
                <SectionHeading eyebrow="Capabilities" title="What I build" copy="A practical map of the problems I can work on, with the technologies acting as tools rather than the headline." />
                <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {capabilities.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <motion.article key={item.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ delay: reduceMotion ? 0 : index * 0.05 }} className="group min-h-72 rounded-[2rem] border border-border/60 bg-card/35 p-6 transition hover:-translate-y-1 hover:border-border md:p-7">
                                <div className="flex size-11 items-center justify-center rounded-2xl border border-border/60 bg-background"><Icon className="size-5" /></div>
                                <h2 className="mt-7 text-2xl font-bold tracking-tight">{item.title}</h2>
                                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.copy}</p>
                                <div className="mt-6 flex flex-wrap gap-2">{item.stack.map((tech) => <span key={tech} className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{tech}</span>)}</div>
                            </motion.article>
                        );
                    })}
                </div>
            </section>

            <section id="toolchain" className="border-y border-border/50 bg-foreground/[0.02] py-24 lg:py-32">
                <div className="mx-auto max-w-7xl px-5 sm:px-8">
                    <SectionHeading eyebrow="Toolchain" title="Built with the right tools" copy="A compact view of the stack I reach for across engineering, infrastructure, automation and design." />
                    <div className="mt-12 divide-y divide-border/60 border-y border-border/60">
                        {toolchain.map((group) => (
                            <div key={group.label} className="grid gap-5 py-6 md:grid-cols-[220px_1fr] md:items-center">
                                <h3 className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">{group.label}</h3>
                                <div className="flex flex-wrap gap-x-5 gap-y-2 text-base font-semibold sm:text-lg">{group.items.map((item) => <span key={item}>{item}</span>)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="proof" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
                <SectionHeading eyebrow="Proof, not percentages" title="Used in real work" copy="Instead of claiming a percentage, this view connects frequently used technologies with actual projects in the portfolio." />
                <div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {proof.map(([name, usage]) => (
                        <article key={name} className="rounded-2xl border border-border/60 p-5">
                            <div className="flex items-start justify-between gap-4"><h3 className="text-xl font-bold">{name}</h3><span className="rounded-full bg-muted px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{usage.projects} project{usage.projects === 1 ? '' : 's'}</span></div>
                            <p className="mt-5 text-xs uppercase tracking-[0.16em] text-muted-foreground">{usage.examples.join(' · ')}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="border-y border-border/50 bg-foreground/[0.02] py-20">
                <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
                    <div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">Currently exploring</p><h2 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-5xl">The lab keeps moving.</h2></div>
                    <div className="flex flex-wrap gap-3">{['Agentic AI', 'Three.js', 'WebGL', 'Infrastructure automation', 'Local-first tooling', 'Creative coding'].map((item) => <span key={item} className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm font-semibold">{item}</span>)}</div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-5 py-28 sm:px-8 lg:py-40">
                <div className="overflow-hidden rounded-[2.5rem] border border-border/60 bg-foreground px-6 py-10 text-background sm:px-10 lg:px-14 lg:py-16">
                    <div className="grid gap-10 lg:grid-cols-[1fr_.65fr] lg:items-end">
                        <div><div className="flex items-center gap-2 text-background/55"><Bot className="size-5" /><span className="font-mono text-[10px] font-bold uppercase tracking-[0.28em]">Lab philosophy</span></div><h2 className="mt-5 max-w-4xl text-4xl font-black tracking-[-0.055em] sm:text-6xl">I don&apos;t collect technologies. I use them to solve problems.</h2></div>
                        <div><p className="leading-7 text-background/65">The stack changes. The goal stays the same: build useful systems, make them maintainable, and leave enough room to keep learning.</p><Link href="/projects" className="mt-7 inline-flex items-center gap-2 rounded-full bg-background px-5 py-3 text-sm font-bold text-foreground">Explore projects <ArrowRight className="size-4" /></Link></div>
                    </div>
                </div>
            </section>
        </main>
    );
}

function SectionHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
    return (
        <div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr] lg:items-end">
            <div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">{eyebrow}</p><h2 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">{title}</h2></div>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">{copy}</p>
        </div>
    );
}
