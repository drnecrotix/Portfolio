'use client';

import { useEffect, useState } from 'react';
import { GitHubCalendar } from 'react-github-calendar';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { GitCommit, Star, Zap, TrendingUp, Github, ChevronDown } from 'lucide-react';
import { Counter } from '@/components/ui/Counter';

export interface GitHubSummary {
    totalStars: number;
    totalCommits: number;
    totalPRs: number;
    totalContributions: number;
    thisWeek: number;
    bestDay: number;
    average: number;
    followers: number;
    recentActivity?: any[];
}

export function useGitHubData(username: string) {
    const [summary, setSummary] = useState<GitHubSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGitHubData = async () => {
            try {
                const res = await fetch('/api/github-stats');
                if (res.ok) {
                    const json = await res.json();
                    const data = json.data;
                    const average = parseFloat((data.totalContributions / 365).toFixed(1));
                    setSummary({ ...data, average });
                }
            } catch (error) {
                console.error('Failed to fetch GitHub stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchGitHubData();
    }, [username]);

    return { summary, loading };
}

export function GitHubHeatmap({ username }: { username: string }) {
    const { theme } = useTheme();
    const t = useTranslations('technical.github');
    const [mounted, setMounted] = useState(false);
    const [showActivity, setShowActivity] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const goldTheme = {
        light: ['#ebedf0', '#fef9c3', '#fde047', '#eab308', '#a16207'],
        dark: ['#161b22', '#422006', '#854d0e', '#eab308', '#facc15'],
    };

    const { summary } = useGitHubData(username);

    if (!mounted) return null;

    return (
        <div className="w-full overflow-visible font-sans transition-colors duration-300">
            {/* Keep a little optical breathing room so large G glyphs are not clipped by the section edge. */}
            <div className="-ml-1 mb-4 flex items-center gap-3 overflow-visible pl-1">
                <Github className="h-8 w-8 shrink-0 text-gray-900 dark:text-white" />
                <h2 className="overflow-visible py-0.5 text-2xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white md:text-3xl">
                    {t('title')}
                </h2>
            </div>
            <p className="mb-8 -mt-2 text-sm text-gray-600 dark:text-[#8b949e] md:text-base">
                {t('description')}
            </p>

            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label="Total" value={summary?.totalContributions || 0} icon={<Zap className="h-4 w-4 text-orange-500" />} />
                <StatCard label="Total Commits" value={summary?.totalCommits || 0} icon={<GitCommit className="h-4 w-4 text-blue-500" />} />
                <StatCard label="PRs & Merges" value={summary?.totalPRs || 0} icon={<TrendingUp className="h-4 w-4 text-green-500" />} />
                <StatCard label="Total Stars" value={summary?.totalStars || 0} icon={<Star className="h-4 w-4 text-yellow-500" />} />
            </div>

            <div className="mb-10 w-full overflow-hidden">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-900 dark:text-white md:text-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Activity Calendar
                    </h3>
                </div>

                <div className="custom-scrollbar w-full overflow-x-auto pb-2">
                    <div className="min-w-full">
                        <GitHubCalendar
                            username={username}
                            colorScheme={theme === 'dark' ? 'dark' : 'light'}
                            theme={goldTheme}
                            blockMargin={4}
                            blockSize={23}
                            fontSize={14}
                            showTotalCount={false}
                            showColorLegend={false}
                            labels={{
                                months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                                weekdays: ['Dom', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
                                totalCount: '{{count}} contributions in {{year}}',
                                legend: { less: t('less'), more: t('more') },
                            }}
                        />
                    </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-gray-600 dark:text-[#8b949e]">
                    <span>{t('less')}</span>
                    <div className="flex gap-1">
                        {(theme === 'dark' ? goldTheme.dark : goldTheme.light).map((color, i) => (
                            <div key={i} className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
                        ))}
                    </div>
                    <span>{t('more')}</span>
                </div>
            </div>

            {summary?.recentActivity && summary.recentActivity.length > 0 && (
                <div className="mb-8 w-full">
                    <button onClick={() => setShowActivity(!showActivity)} className="group flex w-full items-center justify-between py-2">
                        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            Recent Activity
                        </h3>
                        <div className="rounded-full p-1 transition-colors hover:bg-gray-100 dark:hover:bg-white/10">
                            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-300 dark:text-gray-400 ${showActivity ? 'rotate-180' : ''}`} />
                        </div>
                    </button>

                    <motion.div
                        initial={false}
                        animate={{ height: showActivity ? 'auto' : 0, opacity: showActivity ? 1 : 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="flex flex-col pt-2">
                            {summary.recentActivity.map((activity, idx) => (
                                <div key={idx} className="group flex items-center rounded-lg px-2 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                                    <span className="w-8 font-mono text-xs text-gray-400 dark:text-gray-600">{String(idx + 1).padStart(2, '0')}</span>
                                    <div className="flex flex-1 flex-row items-center justify-between gap-4">
                                        <span className="truncate text-sm font-medium text-gray-900 transition-colors group-hover:text-blue-500 dark:text-gray-200 md:text-base">
                                            {activity.type === 'push' ? (
                                                <>Pushed to <span className="text-gray-500 transition-colors group-hover:text-blue-400 dark:text-gray-500">{activity.repo}</span></>
                                            ) : (
                                                <>{activity.status === 'merged' ? 'Merged PR in' : 'Opened PR in'} <span className="text-gray-500 transition-colors group-hover:text-blue-400 dark:text-gray-500">{activity.repo}</span></>
                                            )}
                                        </span>
                                        <span className="whitespace-nowrap text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-600">
                                            {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
    return (
        <div className="group relative flex min-h-[125px] flex-col justify-between rounded-2xl border border-gray-300 bg-transparent p-4 transition-all duration-300 hover:border-yellow-500/30 hover:bg-gray-100/50 dark:border-[#30363d] dark:hover:border-yellow-500/30 dark:hover:bg-[#161b22]/50">
            <div className="flex items-center gap-2">
                <div className="text-gray-600 transition-colors duration-300 group-hover:text-yellow-600 dark:text-gray-400 dark:group-hover:text-yellow-500">{icon}</div>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-600 opacity-80 dark:text-[#8b949e]">{label}</span>
            </div>
            <span className="text-2xl font-extrabold tracking-tighter text-gray-900 dark:text-white md:text-3xl">
                <Counter value={typeof value === 'string' ? parseFloat(value) : value} decimal={typeof value === 'string' && value.includes('.') ? 1 : 0} />
                {typeof value === 'string' && value.includes('+') ? '+' : ''}
            </span>
        </div>
    );
}

export function StatPod({ label, value, icon, color, delay, suffix = '' }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay }}
            className="group relative flex h-full flex-col justify-between overflow-hidden rounded-[2rem] border border-border bg-card/85 p-6 shadow-lg backdrop-blur-xl transition-all duration-500 hover:border-emerald-500/40"
        >
            <div className={`absolute right-0 top-0 h-24 w-24 opacity-10 blur-3xl transition-opacity group-hover:opacity-20 ${color.replace('text-', 'bg-')}`} />
            <div className="relative z-10 flex items-center gap-3">
                <div className={`rounded-lg border border-white/5 bg-white/5 p-2 transition-colors group-hover:border-white/20 ${color}`}>{icon}</div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500 transition-colors group-hover:text-foreground dark:text-zinc-400">{label}</span>
            </div>
            <div className="relative z-10 mt-4">
                <div className="origin-left text-3xl font-black tracking-tighter text-foreground transition-transform group-hover:scale-105">
                    {value}<span className="ml-1 text-xs font-normal text-muted-foreground/50">{suffix}</span>
                </div>
            </div>
            <div className="absolute -bottom-2 -right-2 h-12 w-12 rounded-tl-2xl border-l border-t border-white/5 opacity-50" />
        </motion.div>
    );
}
