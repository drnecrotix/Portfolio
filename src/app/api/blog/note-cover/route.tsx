import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';

export async function GET() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    position: 'relative',
                    overflow: 'hidden',
                    background: 'linear-gradient(135deg, #07070a 0%, #101018 52%, #09090d 100%)',
                    color: '#f5f5f5',
                    fontFamily: 'Arial, Helvetica, sans-serif',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        width: 520,
                        height: 520,
                        borderRadius: 520,
                        border: '1px solid rgba(255,255,255,0.08)',
                        right: -110,
                        top: -145,
                        display: 'flex',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        width: 360,
                        height: 360,
                        borderRadius: 360,
                        border: '1px solid rgba(217,70,239,0.16)',
                        right: -30,
                        top: -62,
                        display: 'flex',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        inset: 28,
                        border: '1px solid rgba(255,255,255,0.09)',
                        borderRadius: 28,
                        display: 'flex',
                    }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '68px 78px', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                        <div
                            style={{
                                width: 46,
                                height: 46,
                                borderRadius: 14,
                                border: '1px solid rgba(255,255,255,0.18)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(255,255,255,0.035)',
                            }}
                        >
                            <div style={{ width: 12, height: 12, borderRadius: 12, background: '#d946ef', display: 'flex' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: 18, letterSpacing: 6, color: 'rgba(255,255,255,0.54)', textTransform: 'uppercase' }}>Necrotix Lab</div>
                            <div style={{ marginTop: 7, fontSize: 14, letterSpacing: 4, color: 'rgba(255,255,255,0.26)', textTransform: 'uppercase' }}>Journal / Notes</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 52 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 760 }}>
                            <div style={{ fontSize: 23, letterSpacing: 8, color: '#d946ef', textTransform: 'uppercase' }}>Field Note</div>
                            <div style={{ marginTop: 22, fontSize: 82, fontWeight: 800, letterSpacing: -5, lineHeight: 0.96 }}>Fragments worth keeping.</div>
                            <div style={{ marginTop: 28, fontSize: 21, lineHeight: 1.45, color: 'rgba(255,255,255,0.48)' }}>Short observations, unfinished ideas and things that should not disappear.</div>
                        </div>

                        <div
                            style={{
                                width: 168,
                                height: 210,
                                borderRadius: 22,
                                border: '1px solid rgba(255,255,255,0.12)',
                                background: 'rgba(255,255,255,0.025)',
                                display: 'flex',
                                flexDirection: 'column',
                                padding: 26,
                                transform: 'rotate(4deg)',
                            }}
                        >
                            <div style={{ width: 58, height: 7, borderRadius: 8, background: 'rgba(217,70,239,0.78)', display: 'flex' }} />
                            {[0, 1, 2, 3, 4].map((line) => (
                                <div key={line} style={{ marginTop: line === 0 ? 32 : 18, width: line === 4 ? '58%' : '100%', height: 4, borderRadius: 6, background: 'rgba(255,255,255,0.16)', display: 'flex' }} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
            headers: {
                'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
            },
        },
    );
}
