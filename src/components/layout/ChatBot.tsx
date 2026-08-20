"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Bot, ChevronDown, Loader2, Maximize2, MessageSquare, Minimize2, RotateCcw, Send, User, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    error?: boolean;
}

type PublicAssistantConfig = {
    status: "ready" | "limited" | "disabled";
    enabled: boolean;
    assistantName: string;
    roleLabel: string;
    headerSubtitle: string;
    welcomeMessage: string;
    inputPlaceholder: string;
    inputHint: string;
    suggestedQuestions: string[];
    proactiveEnabled: boolean;
    proactiveMessage: string;
    proactiveDelaySeconds: number;
    assistantConfigured: boolean;
    responseTemplateCount: number;
};

const fallbackConfig: PublicAssistantConfig = {
    status: "limited",
    enabled: true,
    assistantName: "AI Assistant",
    roleLabel: "AI portfolio guide",
    headerSubtitle: "Ask me about this portfolio",
    welcomeMessage: "Hi! I can help you explore this portfolio, its projects, experience and published work.",
    inputPlaceholder: "Ask a question…",
    inputHint: "Enter to send · Shift+Enter for a new line",
    suggestedQuestions: ["What can you do?", "Show me the projects", "What experience is listed?", "How can I get in touch?"],
    proactiveEnabled: false,
    proactiveMessage: "",
    proactiveDelaySeconds: 18,
    assistantConfigured: false,
    responseTemplateCount: 0,
};

function generateId() { return Math.random().toString(36).slice(2, 11); }
function formatTime(date: Date) { return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

function inlineFormat(text: string): React.ReactNode {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
    return parts.map((part, idx) => {
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={idx}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*")) return <em key={idx}>{part.slice(1, -1)}</em>;
        if (part.startsWith("`") && part.endsWith("`")) return <code key={idx} className="px-1 py-0.5 rounded text-xs font-mono bg-foreground/10">{part.slice(1, -1)}</code>;
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) return <a key={idx} href={linkMatch[2]} target={linkMatch[2].startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80">{linkMatch[1]}</a>;
        return part;
    });
}

function SimpleMarkdown({ text }: { text: string }) {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let i = 0;
    let key = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (!line.trim()) { elements.push(<div key={key++} className="h-2" />); i++; continue; }
        if (line.startsWith("## ")) { elements.push(<p key={key++} className="font-semibold text-sm mt-2 mb-1">{inlineFormat(line.slice(3))}</p>); i++; continue; }
        if (line.startsWith("# ")) { elements.push(<p key={key++} className="font-bold text-sm mt-2 mb-1">{inlineFormat(line.slice(2))}</p>); i++; continue; }
        if (/^[-*•] /.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^[-*•] /.test(lines[i])) items.push(lines[i++].replace(/^[-*•] /, ""));
            elements.push(<ul key={key++} className="list-disc list-inside space-y-0.5 my-1">{items.map((item, idx) => <li key={idx} className="text-sm leading-relaxed">{inlineFormat(item)}</li>)}</ul>);
            continue;
        }
        if (/^\d+\. /.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^\d+\. /.test(lines[i])) items.push(lines[i++].replace(/^\d+\. /, ""));
            elements.push(<ol key={key++} className="list-decimal list-inside space-y-0.5 my-1">{items.map((item, idx) => <li key={idx} className="text-sm leading-relaxed">{inlineFormat(item)}</li>)}</ol>);
            continue;
        }
        elements.push(<p key={key++} className="text-sm leading-relaxed">{inlineFormat(line)}</p>);
        i++;
    }
    return <div className="space-y-1">{elements}</div>;
}

const MessageBubble = React.memo(function MessageBubble({ message, onRetry }: { message: Message; onRetry?: () => void }) {
    const t = useTranslations("chatbot");
    const isUser = message.role === "user";
    return (
        <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.2 }} className={cn("flex gap-2.5 w-full", isUser ? "flex-row-reverse" : "flex-row")}>
            <div className={cn("flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5", isUser ? "bg-primary/20 border border-primary/30" : "bg-foreground/10 border border-foreground/10")}>
                {isUser ? <User className="w-3.5 h-3.5 text-primary" /> : <Bot className="w-3.5 h-3.5 text-foreground/70" />}
            </div>
            <div className={cn("flex flex-col gap-1 max-w-[82%]", isUser ? "items-end" : "items-start")}>
                <div className={cn("px-3.5 py-2.5 rounded-2xl break-words", isUser ? "bg-primary text-primary-foreground rounded-tr-sm" : message.error ? "bg-destructive/10 border border-destructive/20 text-destructive rounded-tl-sm" : "bg-foreground/8 border border-foreground/8 text-foreground rounded-tl-sm")}>
                    {isUser ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p> : message.error ? (
                        <div className="flex flex-col gap-2"><div className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /><p className="text-sm">{message.content}</p></div>{onRetry && <button onClick={onRetry} className="flex items-center gap-1 text-xs underline underline-offset-2 hover:opacity-80 w-fit"><RotateCcw className="w-3 h-3" />{t("retry")}</button>}</div>
                    ) : <SimpleMarkdown text={message.content} />}
                </div>
                <span className="text-[10px] text-foreground/40 px-1">{formatTime(message.timestamp)}</span>
            </div>
        </motion.div>
    );
});

function TypingIndicator() {
    return <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="flex gap-2.5"><div className="flex-shrink-0 w-7 h-7 rounded-full bg-foreground/10 border border-foreground/10 flex items-center justify-center mt-0.5"><Bot className="w-3.5 h-3.5 text-foreground/70" /></div><div className="px-3.5 py-3 rounded-2xl rounded-tl-sm bg-foreground/8 border border-foreground/8"><div className="flex gap-1 items-center h-3">{[0,1,2].map((i) => <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-foreground/40" animate={{ y: [0,-4,0] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }} />)}</div></div></motion.div>;
}

function loadStoredMessages(): Message[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = sessionStorage.getItem("portfolio-chat-messages-v2");
        if (!raw) return [];
        const parsed = JSON.parse(raw) as Array<Omit<Message, "timestamp"> & { timestamp: string }>;
        return parsed.map((item) => ({ ...item, timestamp: new Date(item.timestamp) }));
    } catch { return []; }
}

function ChatWindow({ onClose, origin }: { onClose: () => void; origin?: { x: number; y: number } | null }) {
    const t = useTranslations("chatbot");
    const locale = useLocale();
    const [config, setConfig] = useState<PublicAssistantConfig>(fallbackConfig);
    const [messages, setMessages] = useState<Message[]>(() => loadStoredMessages());
    const [configLoaded, setConfigLoaded] = useState(false);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/chat", { cache: "no-store" }).then((res) => res.ok ? res.json() : Promise.reject()).then((data) => {
            if (cancelled) return;
            const next = { ...fallbackConfig, ...data } as PublicAssistantConfig;
            setConfig(next);
            setConfigLoaded(true);
            setMessages((current) => current.length ? current : [{ id: generateId(), role: "assistant", content: next.welcomeMessage, timestamp: new Date() }]);
        }).catch(() => {
            if (cancelled) return;
            setConfigLoaded(true);
            setMessages((current) => current.length ? current : [{ id: generateId(), role: "assistant", content: fallbackConfig.welcomeMessage, timestamp: new Date() }]);
        });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => { if (messages.length) sessionStorage.setItem("portfolio-chat-messages-v2", JSON.stringify(messages)); }, [messages]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isLoading]);
    useEffect(() => { const timer = setTimeout(() => inputRef.current?.focus(), 100); return () => clearTimeout(timer); }, []);
    useEffect(() => () => abortControllerRef.current?.abort(), []);

    useEffect(() => {
        if (!configLoaded || !config.proactiveEnabled || !config.proactiveMessage) return;
        if (messages.some((message) => message.role === "user")) return;
        if (typeof window !== "undefined" && sessionStorage.getItem("portfolio-chat-proactive-v2")) return;
        const timer = window.setTimeout(() => {
            setMessages((current) => {
                if (current.some((message) => message.role === "user")) return current;
                return [...current, { id: generateId(), role: "assistant", content: config.proactiveMessage, timestamp: new Date() }];
            });
            sessionStorage.setItem("portfolio-chat-proactive-v2", "1");
        }, config.proactiveDelaySeconds * 1000);
        return () => window.clearTimeout(timer);
    }, [configLoaded, config.proactiveEnabled, config.proactiveMessage, config.proactiveDelaySeconds, messages]);

    const scrollToBottom = useCallback(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), []);
    const handleScroll = useCallback(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 60);
    }, []);

    const sendMessage = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || isLoading || !config.enabled) return;
        setLastUserMessage(trimmed);
        setInput("");
        const userMsg: Message = { id: generateId(), role: "user", content: trimmed, timestamp: new Date() };
        setMessages((prev) => [...prev, userMsg]);
        setIsLoading(true);
        const apiMessages = [...messages, userMsg].filter((message) => !message.error).map(({ role, content }) => ({ role, content }));
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();
        try {
            const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: apiMessages, locale }), signal: abortControllerRef.current.signal });
            if (!res.ok) {
                let errorMessage = t("error");
                try { const data = await res.json(); errorMessage = data?.error ?? errorMessage; } catch { /* noop */ }
                throw new Error(errorMessage);
            }
            const data = await res.json();
            if (!data?.reply || typeof data.reply !== "string") throw new Error(t("invalidResponse"));
            setMessages((prev) => [...prev, { id: generateId(), role: "assistant", content: data.reply, timestamp: new Date() }]);
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") return;
            setMessages((prev) => [...prev, { id: generateId(), role: "assistant", content: error instanceof Error ? error.message : t("unknownError"), timestamp: new Date(), error: true }]);
        } finally { setIsLoading(false); }
    }, [messages, isLoading, config.enabled, locale, t]);

    const handleRetry = useCallback(() => {
        if (!lastUserMessage) return;
        setMessages((prev) => prev[prev.length - 1]?.error ? prev.slice(0, -1) : prev);
        void sendMessage(lastUserMessage);
    }, [lastUserMessage, sendMessage]);

    const statusDot = config.status === "ready" ? "bg-emerald-500" : config.status === "limited" ? "bg-amber-400" : "bg-zinc-500";
    const showSuggestions = messages.filter((message) => message.role === "user").length === 0;

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
            <motion.div initial={origin ? { opacity: 0, scale: 0, x: "-50%", y: "-50%" } : { opacity: 0, scale: 0.92, y: 16 }} animate={origin ? { opacity: 1, scale: 1, x: "-50%", y: "-50%" } : { opacity: 1, scale: 1, y: 0 }} exit={origin ? { opacity: 0, scale: 0, x: "-50%", y: "-50%" } : { opacity: 0, scale: 0.92, y: 16 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className={cn("fixed z-50 flex flex-col", origin ? "top-1/2 left-1/2" : isExpanded ? "bottom-4 sm:bottom-12 right-4 sm:right-12" : "bottom-24 right-4 md:right-16", isExpanded ? "w-[calc(100vw-2rem)] sm:w-[600px] md:w-[700px] lg:w-[800px] h-[calc(100vh-2rem)] sm:h-[80vh] max-h-[800px]" : "w-[calc(100vw-2rem)] sm:w-[420px] h-[600px] max-h-[85vh]", "rounded-2xl shadow-2xl overflow-hidden bg-background border border-foreground/10 backdrop-blur-xl transition-all duration-300 ease-in-out")} style={origin ? { transformOrigin: "center" } : { maxWidth: isExpanded ? "800px" : "420px", transformOrigin: "bottom right" }}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/8 bg-foreground/3 flex-shrink-0">
                    <div className="flex items-center gap-2.5"><div className="relative"><div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center"><Bot className="w-4 h-4 text-primary" /></div><span className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background", statusDot)} /></div><div><p className="text-sm font-semibold leading-none">{config.assistantName}</p><p className="text-[11px] text-foreground/50 mt-0.5">{config.headerSubtitle}</p></div></div>
                    <div className="flex items-center gap-1"><button onClick={() => setIsExpanded(!isExpanded)} className="w-7 h-7 rounded-full flex items-center justify-center text-foreground/50 hover:text-foreground hover:bg-foreground/8 transition-colors" aria-label={isExpanded ? "Collapse" : "Expand"}>{isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button><button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-foreground/50 hover:text-foreground hover:bg-foreground/8 transition-colors" aria-label={t("close")}><X className="w-4 h-4" /></button></div>
                </div>

                <div ref={scrollContainerRef} onScroll={handleScroll} data-lenis-prevent className="flex-1 overflow-y-auto px-3.5 py-4 space-y-4 scrollbar-thin scrollbar-thumb-foreground/10 scrollbar-track-transparent">
                    {!configLoaded && <TypingIndicator />}
                    {messages.map((message, index) => <MessageBubble key={message.id} message={message} onRetry={message.error && index === messages.length - 1 ? handleRetry : undefined} />)}
                    <AnimatePresence>{isLoading && <TypingIndicator />}</AnimatePresence>
                    <AnimatePresence>{showSuggestions && configLoaded && !isLoading && config.suggestedQuestions.length > 0 && <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="flex flex-wrap gap-2 pt-1">{config.suggestedQuestions.map((question) => <button key={question} onClick={() => void sendMessage(question)} className="text-xs px-3 py-1.5 rounded-full border bg-foreground/5 border-foreground/10 text-foreground/70 hover:bg-primary/10 hover:border-primary/30 hover:text-foreground active:scale-95 transition-all">{question}</button>)}</motion.div>}</AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>

                <AnimatePresence>{showScrollBtn && <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={scrollToBottom} className="absolute right-3 bottom-20 z-10 w-7 h-7 rounded-full flex items-center justify-center bg-background border border-foreground/15 shadow-md text-foreground/60 hover:text-foreground transition-colors"><ChevronDown className="w-3.5 h-3.5" /></motion.button>}</AnimatePresence>

                <div className="flex-shrink-0 px-3.5 py-3 border-t border-foreground/8 bg-foreground/2">
                    <div className="flex items-end gap-2"><textarea ref={inputRef} data-lenis-prevent value={input} onChange={(event) => { setInput(event.target.value); event.target.style.height = "auto"; event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`; }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(input); } }} disabled={isLoading || !config.enabled} placeholder={config.inputPlaceholder} rows={1} className="flex-1 resize-none rounded-xl px-3.5 py-2.5 text-sm bg-foreground/5 border border-foreground/10 placeholder:text-foreground/35 text-foreground focus:outline-none focus:border-primary/40 focus:bg-foreground/7 transition-colors disabled:opacity-50 min-h-[40px] max-h-[120px] leading-relaxed" style={{ height: "40px" }} /><button onClick={() => void sendMessage(input)} disabled={isLoading || !input.trim() || !config.enabled} className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-primary text-primary-foreground transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 hover:opacity-90" aria-label="Send message">{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</button></div>
                    <p className="text-[10px] text-foreground/30 mt-1.5 text-center">{config.inputHint}</p>
                </div>
            </motion.div>
        </>
    );
}

export function ChatBot({ headless = false }: { headless?: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
    const toggle = useCallback(() => { setOrigin(null); setIsOpen((prev) => !prev); }, []);
    const close = useCallback(() => setIsOpen(false), []);
    useEffect(() => { const handler = (event: KeyboardEvent) => { if (event.key === "Escape" && isOpen) close(); }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, [isOpen, close]);
    useEffect(() => { const handler = (event: Event) => { const customEvent = event as CustomEvent; setOrigin(customEvent.detail && typeof customEvent.detail.x === "number" ? { x: customEvent.detail.x, y: customEvent.detail.y } : null); setIsOpen(true); }; window.addEventListener("portfolio:toggle-chatbot", handler); return () => window.removeEventListener("portfolio:toggle-chatbot", handler); }, []);

    return <><AnimatePresence>{isOpen && <ChatWindow onClose={close} origin={origin} />}</AnimatePresence>{!headless && <motion.button onClick={toggle} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className={cn("relative p-3 rounded-full transition-all group border border-foreground/10", isOpen ? "bg-primary/20 border-primary/40" : "bg-foreground/5 hover:bg-foreground/10")} aria-label="Open portfolio chatbot" aria-expanded={isOpen}><MessageSquare className={cn("w-5 h-5 transition-colors", isOpen ? "text-primary" : "text-foreground/60 group-hover:text-foreground")} />{!isOpen && <motion.span className="absolute inset-0 rounded-full border border-primary/30" animate={{ scale: [1,1.3,1], opacity: [0.4,0,0.4] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} />}</motion.button>}</>;
}
