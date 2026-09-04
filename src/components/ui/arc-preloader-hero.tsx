"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";

export type PreloadPhase = "intro" | "text" | "reveal" | "done";
export const PreloadContext = React.createContext<{ isPreloading: boolean; phase: PreloadPhase }>({ isPreloading: true, phase: "intro" });
export const usePreloadState = () => React.useContext(PreloadContext);

export type ArcRevealGreeting = {
  text: string;
  lang?: string;
};

export interface ArcRevealHeroProps {
  greetings?: ArcRevealGreeting[];
  greetingHold?: number;
  revealDuration?: number;
  className?: string;
  introClassName?: string;
  greetingClassName?: string;
  revealClassName?: string;
  storageKey?: string;
  children?: React.ReactNode;
}

export function ArcRevealHero({
  greetingHold = 420,
  revealDuration = 680,
  className,
  introClassName,
  revealClassName,
  storageKey,
  children,
}: ArcRevealHeroProps) {
  const pathname = usePathname();
  const lenis = useLenis();
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = React.useState<PreloadPhase>("intro");

  const isInitialSSR = React.useRef(true);
  const [renderedChildren, setRenderedChildren] = React.useState(children);

  React.useEffect(() => {
    isInitialSSR.current = false;
  }, []);

  React.useEffect(() => {
    if (phase === "text" || phase === "reveal" || phase === "done" || isInitialSSR.current) {
      setRenderedChildren(children);
    }
  }, [phase, children]);

  React.useEffect(() => {
    if (pathname === "/" && typeof window !== "undefined") {
      try {
        const isLoaded = window.sessionStorage.getItem("portfolioLoaded");
        if (!isLoaded) {
          setPhase("done");
          return;
        }
      } catch {
        setPhase("done");
        return;
      }
    }

    if (storageKey && typeof window !== "undefined") {
      try {
        if (window.sessionStorage.getItem(storageKey) === "done") {
          setPhase("done");
        }
      } catch {
        // Ignore restricted storage and keep the lightweight route loader available.
      }
    }
  }, [pathname, storageKey]);

  React.useEffect(() => {
    const isPreloading = phase !== "done";
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("preload-state-change", { detail: isPreloading }));
    }

    if (isPreloading) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      window.scrollTo(0, 0);
      lenis?.stop();
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      lenis?.start();
    }

    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      lenis?.start();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("preload-state-change", { detail: false }));
      }
    };
  }, [phase, lenis]);

  React.useEffect(() => {
    if (phase !== "intro") return;
    const duration = reduceMotion ? 40 : 300;
    const timer = window.setTimeout(() => setPhase("text"), duration);
    return () => window.clearTimeout(timer);
  }, [phase, reduceMotion]);

  React.useEffect(() => {
    if (phase !== "text") return;
    const duration = reduceMotion ? 40 : greetingHold;
    const timer = window.setTimeout(() => setPhase("reveal"), duration);
    return () => window.clearTimeout(timer);
  }, [phase, greetingHold, reduceMotion]);

  React.useEffect(() => {
    if (phase !== "reveal") return;
    const duration = reduceMotion ? 80 : revealDuration;
    const timer = window.setTimeout(() => {
      setPhase("done");
      if (storageKey && typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem(storageKey, "done");
        } catch {
          // Ignore restricted storage.
        }
      }
    }, duration);
    return () => window.clearTimeout(timer);
  }, [phase, reduceMotion, revealDuration, storageKey]);

  const showOverlay = phase !== "done";
  const revealing = phase === "reveal";
  const panelTransition = {
    duration: reduceMotion ? 0.08 : revealDuration / 1000,
    ease: [0.76, 0, 0.24, 1] as [number, number, number, number],
  };

  return (
    <div className={cn("relative isolate min-h-screen w-full bg-background text-foreground", className)}>
      <PreloadContext.Provider value={{ isPreloading: showOverlay, phase }}>
        <div className={cn("relative z-0", revealClassName)}>{renderedChildren}</div>
      </PreloadContext.Provider>

      <AnimatePresence>
        {showOverlay && (
          <motion.div
            key="focus-route-loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.05 : 0.16 }}
            className={cn("fixed inset-0 z-[999] h-[100dvh] w-full overflow-hidden", introClassName)}
            role="status"
            aria-label="Loading page"
          >
            <motion.div
              className="absolute inset-y-0 left-0 w-[50.5%] bg-[#070707]"
              animate={{ x: revealing ? "-102%" : "0%" }}
              transition={panelTransition}
            >
              <div
                className="absolute inset-0 opacity-70"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 95% 50%, rgba(255,255,255,0.07), transparent 34%), linear-gradient(90deg, rgba(255,255,255,0.02), transparent 36%)",
                }}
              />
            </motion.div>

            <motion.div
              className="absolute inset-y-0 right-0 w-[50.5%] bg-[#070707]"
              animate={{ x: revealing ? "102%" : "0%" }}
              transition={panelTransition}
            >
              <div
                className="absolute inset-0 opacity-70"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 5% 50%, rgba(255,255,255,0.07), transparent 34%), linear-gradient(270deg, rgba(255,255,255,0.02), transparent 36%)",
                }}
              />
            </motion.div>

            <motion.div
              className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px -translate-x-1/2 bg-white/10"
              animate={{ opacity: revealing ? 0 : [0.15, 0.75, 0.25], scaleY: revealing ? 0.35 : 1 }}
              transition={
                revealing
                  ? { duration: reduceMotion ? 0.05 : 0.18 }
                  : { duration: 1.25, repeat: Infinity, ease: "easeInOut" }
              }
            />

            <motion.div
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
              animate={{ opacity: revealing ? 0 : 1, scale: revealing ? 1.08 : 1 }}
              transition={{ duration: reduceMotion ? 0.05 : 0.22 }}
            >
              <div className="relative flex flex-col items-center">
                <div className="relative h-20 w-20 sm:h-24 sm:w-24">
                  <motion.div
                    className="absolute inset-0 rounded-full border border-white/10 border-t-white/80"
                    animate={reduceMotion ? undefined : { rotate: 360 }}
                    transition={reduceMotion ? undefined : { duration: 1.45, repeat: Infinity, ease: "linear" }}
                  />
                  <motion.div
                    className="absolute inset-[10px] rounded-full border border-white/10 border-b-white/45"
                    animate={reduceMotion ? undefined : { rotate: -360 }}
                    transition={reduceMotion ? undefined : { duration: 2.1, repeat: Infinity, ease: "linear" }}
                  />
                  <motion.div
                    className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
                    animate={reduceMotion ? undefined : { scale: [0.7, 1.2, 0.7], opacity: [0.45, 1, 0.45] }}
                    transition={reduceMotion ? undefined : { duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                  />

                  <span className="absolute left-0 top-0 h-3 w-3 border-l border-t border-white/35" />
                  <span className="absolute right-0 top-0 h-3 w-3 border-r border-t border-white/35" />
                  <span className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-white/35" />
                  <span className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-white/35" />
                </div>

                <div className="mt-7 h-px w-28 overflow-hidden bg-white/10 sm:w-36">
                  <motion.div
                    className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/85 to-transparent"
                    animate={reduceMotion ? undefined : { x: ["-120%", "240%"] }}
                    transition={reduceMotion ? undefined : { duration: 1.15, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              </div>
            </motion.div>

            <span className="sr-only">Loading</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
