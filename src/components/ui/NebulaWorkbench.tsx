'use client';

import React, { useRef, useMemo } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import Image from 'next/image';

interface ToolItem {
    name: string;
    icon: string;
}

interface NebulaWorkbenchProps {
    tools: ToolItem[];
    className?: string;
}

function ToolCluster({ tool, index, progress }: { tool: ToolItem; index: number; progress: ReturnType<typeof useSpring> }) {
    const y = useTransform(progress, [0, 1], [100 + index * 50, -100 - index * 50]);
    const rotate = useTransform(progress, [0, 1], [index * 10, -index * 10]);

    return (
        <motion.div style={{ y, rotateZ: rotate }} className="flex flex-col items-center group cursor-help">
            <div className="relative w-48 h-48 flex items-center justify-center">
                <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                <motion.div whileHover={{ scale: 1.1, rotateY: 20 }} className="relative w-24 h-24 grayscale group-hover:grayscale-0 transition-all duration-700">
                    <Image src={tool.icon} alt={tool.name} fill className="object-contain drop-shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]" unoptimized />
                </motion.div>
                <div className="absolute -bottom-12 opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-4 group-hover:translate-y-0 text-center">
                    <span className="block text-xs font-black italic uppercase tracking-widest text-primary">{tool.name}</span>
                    <span className="block text-[8px] font-mono text-white/20 mt-1">CORE_ARTIFACT_{index}</span>
                </div>
            </div>
        </motion.div>
    );
}

export const NebulaWorkbench = ({ tools, className }: NebulaWorkbenchProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"]
    });

    const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
    const headerOpacity = useTransform(smoothProgress, [0, 0.2], [0, 1]);

    // Fog cloud generation
    const clouds = useMemo(() => Array.from({ length: 8 }).map((_, i) => ({
        size: Math.random() * 600 + 400,
        x: Math.random() * 100 - 50,
        y: Math.random() * 100 - 50,
        color: i % 2 === 0 ? 'rgba(var(--primary-rgb), 0.05)' : 'rgba(100, 100, 255, 0.03)',
        delay: Math.random() * 5
    })), []);

    return (
        <div ref={containerRef} className={`relative min-h-[150vh] flex flex-col items-center justify-center py-48 overflow-hidden ${className}`}>

            {/* Volumetric Fog Layer (Optimized Gradient instead of heavy blurs) */}
            <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.05)_0%,transparent_70%)] opacity-50" />

            {/* Header Transition */}
            <motion.div
                className="relative z-10 text-center mb-32"
                style={{ opacity: headerOpacity }}
            >
                <span className="text-[10px] font-black uppercase tracking-[1em] text-primary/30">Artisan_Workbench</span>
                <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter mt-4 text-white/10">Nebula_01</h2>
            </motion.div>

            {/* Organic Tool Clusters */}
            <div className="relative z-10 w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-24 px-12 mt-24">
                {tools.map((tool, index) => (
                    <ToolCluster key={tool.name} tool={tool} index={index} progress={smoothProgress} />
                ))}
            </div>

            {/* Final Vapor Exit */}
            <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-background to-transparent z-20 pointer-events-none" />
        </div>
    );
};
