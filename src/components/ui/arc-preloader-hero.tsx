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

const SIGNAL_PATHS = [
  "M42 128 L88 58 L160 34 L244 68 L282 138 L236 202 L150 216 L70 186 Z",
  "M88 58 L150 122 L244 68",
  "M42 128 L150 122 L70 186",
  "M150 122 L236 202",
  "M160 34 L150 122 L150 216",
  "M244 68 L282 138 L150 122",
];

const SIGNAL_NODES = [
  { cx: 42, cy: 128, delay: 0.02 },
  { cx: 88, cy: 58, delay: 0.1 },
  { cx: 160, cy: 34, delay: 0.16 },
  { cx: 244, cy: 68, delay: 0.22 },
  { cx: 282, cy: 138, delay: 0.28 },
  { cx: 236, cy: 202, delay: 0.34 },
  { cx: 150, cy: 216, delay: 0.4 },
  { cx: 70, cy: 186, delay: 0.46 },
  { cx: 150, cy: 122, delay: 0.18 },
];

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
    let finishTimer: number | null = null;
    const finishWithoutRouteLoader = () => {
      finishTimer = window.setTimeout(() => setPhase("done"), 0);
    };

    if (pathname === "/" && typeof window !== "undefined") {
      try {
        const isLoaded = window.sessionStorage.getItem("portfolioLoaded");
        if (!isLoaded) {
          finishWithoutRouteLoader();
          return () => {
            if (finishTimer !== null) window.clearTimeout(finishTimer);
          };
        }
      } catch {
        finishWithoutRouteLoader();
        return () => {
          if (finishTimer !== null) window.clearTimeout(finishTimer);
        };
      }
    }

    if (storageKey && typeof window !== "undefined") {
      try {
        if (window.sessionStorage.getItem(storageKey) === "done") {
          finishWithoutRouteLoader();
        }
      } catch {
        // Ignore restricted storage and keep the lightweight route loader available.
      }
    }

    return () => {
      if (finishTimer !== null) window.clearTimeout(finishTimer);
    };
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

  return (
    <div className={cn("relative isolate min-h-screen w-full bg-background text-foreground", className)}>
      <PreloadContext.Provider value={{ isPreloading: showOverlay, phase }}>
        <div className={cn("relative z-0", revealClassName)}>{renderedChildren}</div>
      </PreloadContext.Provider>

      <AnimatePresence>
        {showOverlay && (
          <motion.div
            key="signal-route-loader"
            initial={{ opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.018, filter: "blur(8px)" }}
            transition={{ duration: reduceMotion ? 0.06 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            className={cn("fixed inset-0 z-[999] h-[100dvh] w-full overflow-hidden bg-[#050505]", introClassName)}
            role="status"
            aria-label="Loading page"
          >
            <motion.div
              className="absolute -inset-[22%] opacity-80"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.055) 0, rgba(255,255,255,0.018) 22%, transparent 48%), conic-gradient(from 210deg at 50% 50%, transparent, rgba(255,255,255,0.018), transparent 32%, rgba(255,255,255,0.028), transparent 68%)",
              }}
              animate={
                reduceMotion
                  ? undefined
                  : revealing
                    ? { scale: 1.28, rotate: 7, opacity: 0 }
                    : { scale: [1, 1.035, 1], rotate: [0, 1.5, 0], opacity: [0.55, 0.85, 0.55] }
              }
              transition={
                revealing
                  ? { duration: revealDuration / 1000, ease: [0.22, 1, 0.36, 1] }
                  : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }
              }
            />

            <div
              className="absolute inset-0 opacity-[0.13]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.055) 1px, transparent 1px)",
                backgroundSize: "54px 54px",
                maskImage: "radial-gradient(circle at center, black 0%, rgba(0,0,0,0.8) 30%, transparent 72%)",
              }}
            />

            <motion.div
              className="pointer-events-none absolute left-1/2 top-1/2 h-[min(78vw,460px)] w-[min(78vw,460px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.055]"
              animate={
                reduceMotion
                  ? undefined
                  : revealing
                    ? { scale: 5.4, opacity: 0 }
                    : { scale: [0.72, 1.02, 1.18], opacity: [0, 0.42, 0] }
              }
              transition={
                revealing
                  ? { duration: revealDuration / 1000, ease: [0.16, 1, 0.3, 1] }
                  : { duration: 1.55, repeat: Infinity, ease: "easeOut" }
              }
            />

            <motion.div
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-8"
              animate={
                revealing
                  ? { opacity: 0, scale: reduceMotion ? 1 : 1.12, rotate: reduceMotion ? 0 : 1.2 }
                  : { opacity: 1, scale: 1, rotate: 0 }
              }
              transition={{ duration: reduceMotion ? 0.06 : 0.34, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="relative w-full max-w-[440px]">
                <motion.svg
                  viewBox="0 0 320 240"
                  className="h-auto w-full overflow-visible"
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: reduceMotion ? 0.05 : 0.32, ease: "easeOut" }}
                  aria-hidden="true"
                >
                  <defs>
                    <radialGradient id="signal-node" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="white" stopOpacity="1" />
                      <stop offset="100%" stopColor="white" stopOpacity="0.15" />
                    </radialGradient>
                  </defs>

                  {SIGNAL_PATHS.map((path, index) => (
                    <motion.path
                      key={path}
                      d={path}
                      fill="none"
                      stroke="rgba(255,255,255,0.24)"
                      strokeWidth="0.8"
                      initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: revealing ? 0 : 0.72 }}
                      transition={{
                        pathLength: { duration: reduceMotion ? 0.05 : 0.55, delay: reduceMotion ? 0 : index * 0.045, ease: "easeInOut" },
                        opacity: { duration: reduceMotion ? 0.05 : 0.22 },
                      }}
                    />
                  ))}

                  {SIGNAL_NODES.map((node, index) => {
                    const isCore = index === SIGNAL_NODES.length - 1;
                    return (
                      <motion.circle
                        key={`${node.cx}-${node.cy}`}
                        cx={node.cx}
                        cy={node.cy}
                        r={isCore ? 4.2 : 2.6}
                        fill="url(#signal-node)"
                        initial={reduceMotion ? false : { opacity: 0, scale: 0 }}
                        animate={
                          reduceMotion
                            ? { opacity: 0.85, scale: 1 }
                            : revealing
                              ? { opacity: 0, scale: 0.5 }
                              : { opacity: [0.35, 1, 0.35], scale: [0.8, isCore ? 1.35 : 1.16, 0.8] }
                        }
                        transition={
                          revealing
                            ? { duration: 0.2 }
                            : { duration: isCore ? 0.9 : 1.35, delay: node.delay, repeat: Infinity, ease: "easeInOut" }
                        }
                        style={{ transformOrigin: `${node.cx}px ${node.cy}px` }}
                      />
                    );
                  })}

                  <motion.circle
                    cx="150"
                    cy="122"
                    r="17"
                    fill="none"
                    stroke="rgba(255,255,255,0.16)"
                    strokeWidth="0.7"
                    strokeDasharray="2 5"
                    animate={reduceMotion ? undefined : { rotate: 360 }}
                    transition={reduceMotion ? undefined : { duration: 4.5, repeat: Infinity, ease: "linear" }}
                    style={{ transformOrigin: "150px 122px" }}
                  />
                </motion.svg>

                <motion.div
                  className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_26px_rgba(255,255,255,0.8)]"
                  animate={
                    reduceMotion
                      ? undefined
                      : { boxShadow: ["0 0 10px rgba(255,255,255,0.35)", "0 0 34px rgba(255,255,255,0.9)", "0 0 10px rgba(255,255,255,0.35)"] }
                  }
                  transition={reduceMotion ? undefined : { duration: 1.15, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            </motion.div>

            <motion.div
              className="pointer-events-none absolute left-1/2 top-1/2 z-30 h-[2px] w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
              animate={
                reduceMotion
                  ? undefined
                  : revealing
                    ? { scale: 520, opacity: [0.75, 0.12, 0] }
                    : { scale: [1, 2.4, 1], opacity: [0.35, 0.9, 0.35] }
              }
              transition={
                revealing
                  ? { duration: Math.max(0.28, revealDuration / 1000), ease: [0.16, 1, 0.3, 1] }
                  : { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
              }
            />

            <span className="sr-only">Loading</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
