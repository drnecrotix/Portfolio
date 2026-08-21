import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Github, Linkedin, Instagram, Bot, Zap, ExternalLink, MessageSquare } from 'lucide-react';
import gsap from "gsap";
import { ProfileCard } from "@/components/ui/profile-card";
import { Spotlight } from "@/components/ui/spotlight-new";
import { defaultHomepageContent, type HomepageContent } from '@/lib/homepage-content';
import { defaultPublicIdentity, type PublicIdentity } from '@/lib/public-identity';

export function HeroVisual({
  isExiting = false,
  content = defaultHomepageContent,
  identity = defaultPublicIdentity,
}: {
  isExiting?: boolean;
  content?: HomepageContent;
  identity?: PublicIdentity;
}) {
  const [showProfile, setShowProfile] = useState(false);
  const [tooltip, setTooltip] = useState<{ show: boolean; text: string; x: number; y: number; icon: 'zap' | 'bot' | null }>({ show: false, text: '', x: 0, y: 0, icon: null });

  const githubRef = useRef(null);
  const linkedinRef = useRef(null);
  const instagramRef = useRef(null);
  const zapRef = useRef(null);
  const zapSmallRef = useRef(null);
  const botRef = useRef(null);

  useEffect(() => {
    if (!isExiting) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(githubRef.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1, ease: "power3.out", onComplete: () => {
        gsap.to(githubRef.current, { y: -10, duration: 2, repeat: -1, yoyo: true, ease: "sine.inOut", force3D: true });
      }});
      gsap.fromTo(linkedinRef.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1, delay: 0.1, ease: "power3.out", onComplete: () => {
        gsap.to(linkedinRef.current, { y: 10, duration: 2.5, repeat: -1, yoyo: true, ease: "sine.inOut", force3D: true });
      }});
      gsap.fromTo(instagramRef.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1, delay: 0.2, ease: "power3.out", onComplete: () => {
        gsap.to(instagramRef.current, { x: 10, duration: 3, repeat: -1, yoyo: true, ease: "sine.inOut", force3D: true });
      }});
      gsap.to([zapRef.current, zapSmallRef.current], { scale: 1.2, duration: 0.6, repeat: -1, yoyo: true, ease: "power2.inOut", force3D: true });
      gsap.to(botRef.current, { rotation: 8, y: -10, duration: 1.8, repeat: -1, yoyo: true, ease: "sine.inOut", force3D: true });
    });

    return () => ctx.revert();
  }, [isExiting]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background text-foreground selection:bg-primary/20">
      <div className="absolute h-full w-full z-0 bg-[radial-gradient(circle,_#888_0.5px,_transparent_0.5px)] opacity-20 [background-size:24px_24px] dark:bg-[radial-gradient(circle,_#444_0.5px,_transparent_0.5px)]" />

      <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
        <Spotlight duration={10} xOffset={120} translateY={-300}
          gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(0, 0%, 100%, .15) 0, hsla(0, 0%, 100%, .05) 50%, transparent 80%)"
          gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(0, 0%, 100%, .1) 0, hsla(0, 0%, 100%, .02) 80%, transparent 100%)"
          gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(0, 0%, 100%, .08) 0, hsla(0, 0%, 100%, 0) 80%, transparent 100%)" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-[105rem] flex-1 flex-col justify-center pb-14 pt-28 sm:pb-16 sm:pt-32 md:pb-20 md:pt-40">
        <div className="relative flex w-full flex-col justify-center gap-3 px-5 sm:px-6 md:gap-4 md:items-center">
          <AnimatePresence>
            {tooltip.show && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: "spring", damping: 20, stiffness: 300 }} className="pointer-events-none fixed z-[100] flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2.5 font-bold text-white shadow-2xl dark:bg-white dark:text-black" style={{ left: tooltip.x, top: tooltip.y, x: "-50%", y: "-150%" }}>
                {tooltip.icon === 'zap' && <ExternalLink className="h-4 w-4" />}
                {tooltip.icon === 'bot' && <MessageSquare className="h-4 w-4" />}
                <span className="text-sm">{tooltip.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
            <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="max-w-[20rem] text-start text-[10px] font-medium uppercase leading-relaxed tracking-[0.2em] text-muted-foreground md:max-w-[220px] md:text-right md:text-xs">
              {content.intro}
            </motion.p>
            <div className="relative min-w-0">
              {identity.githubUrl && (
                <div ref={githubRef} className="absolute -top-3 right-0 z-20 text-primary/60 opacity-0 hover:text-primary md:-top-4 md:right-2">
                  <a href={identity.githubUrl} target="_blank" rel="noopener noreferrer" className="block" aria-label="GitHub"><Github size={32} /></a>
                </div>
              )}
              <motion.h1 initial={{ opacity: 0, y: 30 }} animate={isExiting ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} className="whitespace-nowrap px-0 text-[clamp(2.7rem,13vw,5.1rem)] font-black leading-[0.85] tracking-tighter text-shiny will-change-transform md:px-4 md:text-[clamp(3rem,11vw,13rem)]">
                {content.lineOne}
              </motion.h1>
            </div>
          </div>

          <div className="relative flex items-center gap-8">
            <div className="relative min-w-0">
              {identity.linkedinUrl && (
                <div ref={linkedinRef} className="absolute -top-6 left-0 z-20 text-primary/60 opacity-0 hover:text-primary md:-top-8 md:left-4">
                  <a href={identity.linkedinUrl} target="_blank" rel="noopener noreferrer" className="block" aria-label="LinkedIn"><Linkedin size={32} /></a>
                </div>
              )}
              {identity.instagramUrl && (
                <div ref={instagramRef} className="absolute -bottom-9 right-3 z-20 text-primary/60 opacity-0 hover:text-primary md:-bottom-12 md:right-36">
                  <a href={identity.instagramUrl} target="_blank" rel="noopener noreferrer" className="block" aria-label="Instagram"><Instagram size={32} /></a>
                </div>
              )}
              <motion.h1 initial={{ opacity: 0, y: 30 }} animate={isExiting ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }} transition={{ duration: 1.2, delay: 0.1, ease: [0.16, 1, 0.3, 1] }} className="flex min-w-0 flex-wrap items-center px-0 text-[clamp(2.7rem,13vw,5.1rem)] font-black leading-[0.85] tracking-tighter text-shiny will-change-transform md:px-4 md:text-[clamp(3rem,11vw,13rem)]">
                <span>{content.lineTwoPrefix}</span>
                <div ref={zapRef} className="group relative mx-[0.05em] hidden cursor-pointer lg:block" onClick={() => window.open(content.workspaceUrl, '_blank')} onMouseEnter={(e) => setTooltip({ show: true, text: content.workspaceTooltip, icon: 'zap', x: e.clientX, y: e.clientY })} onMouseMove={(e) => setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }))} onMouseLeave={() => setTooltip(prev => ({ ...prev, show: false }))}>
                  <Zap className="h-[0.8em] w-[0.8em] text-sky-400 transition-colors group-hover:text-sky-300" strokeWidth={1.5} />
                </div>
                <div ref={zapSmallRef} className="group relative mx-[0.02em] block cursor-pointer lg:hidden" onClick={() => window.open(content.workspaceUrl, '_blank')} onMouseEnter={(e) => setTooltip({ show: true, text: content.workspaceTooltip, icon: 'zap', x: e.clientX, y: e.clientY })} onMouseMove={(e) => setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }))} onMouseLeave={() => setTooltip(prev => ({ ...prev, show: false }))}>
                  <Zap className="h-[0.8em] w-[0.8em] text-sky-400 transition-colors group-hover:text-sky-300" strokeWidth={2} />
                </div>
                <span className="min-w-0">{content.lineTwoSuffix}</span>
              </motion.h1>
            </div>
          </div>

          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={isExiting ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }} transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }} className="flex min-w-0 flex-wrap items-center px-0 text-[clamp(2.7rem,13vw,5.1rem)] font-black leading-[0.85] tracking-tighter text-shiny will-change-transform md:px-4 md:text-[clamp(3rem,11vw,13rem)]">
              <span>{content.lineThreePrefix}</span>
              <div ref={botRef} className="group relative mx-[0.05em] cursor-pointer" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                window.dispatchEvent(new CustomEvent('portfolio:toggle-chatbot', { detail: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } }));
              }} onMouseEnter={(e) => setTooltip({ show: true, text: content.assistantTooltip, icon: 'bot', x: e.clientX, y: e.clientY })} onMouseMove={(e) => setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }))} onMouseLeave={() => setTooltip(prev => ({ ...prev, show: false }))}>
                <Bot className="h-[0.85em] w-[0.85em] fill-yellow-500/10 text-yellow-500 transition-colors group-hover:fill-yellow-400/20 group-hover:text-yellow-400" />
              </div>
              <span className="min-w-0">{content.lineThreeSuffix}</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="max-w-[20rem] pt-2 text-[10px] font-medium uppercase leading-relaxed tracking-widest text-muted-foreground md:max-w-[200px] md:pt-8 md:text-xs">
              {content.collaboration}
            </motion.p>
          </div>
        </div>
      </main>

      <div className="group/container absolute left-0 top-1/2 z-50 hidden -translate-y-1/2 transform items-center md:flex" onMouseEnter={() => setShowProfile(true)} onMouseLeave={() => setShowProfile(false)}>
        <div className="relative z-50">
          <motion.div whileHover={{ x: 10 }} className="cursor-pointer rounded-r-3xl border-r border-y border-zinc-200 bg-white px-4 py-10 text-[10px] font-black uppercase tracking-[0.5em] text-black shadow-2xl">
            <span className="rotate-0 [writing-mode:vertical-rl]">{content.availabilityLabel}</span>
          </motion.div>
        </div>

        <AnimatePresence>
          {showProfile && (
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="pointer-events-auto pl-4" style={{ width: 'max-content' }}>
              <ProfileCard
                name={identity.name}
                title={content.profileTitle}
                description={content.profileDescription}
                imageUrl={content.profileImage || identity.avatar || '/dr-necrotix-mark.svg'}
                githubUrl={identity.githubUrl || '#'}
                linkedinUrl={identity.linkedinUrl || '#'}
                instagramUrl={identity.instagramUrl || '#'}
                className="!max-w-4xl origin-left scale-[0.8]"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
