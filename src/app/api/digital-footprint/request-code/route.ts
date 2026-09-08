import { randomInt } from 'node:crypto';
import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isPublicWriteBlocked } from '@/lib/public-write-guard';
import { clientIp, rateLimited, validOrigin } from '@/modules/digital-footprint/http';
import { createVerification, hashValue, normalizeEmail } from '@/modules/digital-footprint/security';
import { getRuntimeSmtpConfig } from '@/lib/integration-runtime';

export const runtime = 'nodejs';

const schema = z.object({ email: z.string().trim().email().max(200), consent: z.literal(true), company: z.string().max(120).optional().default('') });

export async function POST(request: Request) {
    const headers = { 'Cache-Control': 'no-store' };
    if (await isPublicWriteBlocked()) return NextResponse.json({ error: 'Digital Footprint is unavailable in archive mode.' }, { status: 423, headers });
    if (!validOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Enter a valid email and accept the self-audit consent.' }, { status: 400, headers });
    if (parsed.data.company) return NextResponse.json({ message: 'If the address is valid, a code will be sent.' }, { headers });

    const email = normalizeEmail(parsed.data.email);
    const ip = clientIp(request);
    if (rateLimited(`request:${ip}`, 5, 30 * 60 * 1000) || rateLimited(`email:${hashValue(email)}`, 3, 60 * 60 * 1000)) {
        return NextResponse.json({ error: 'Too many verification requests. Try again later.' }, { status: 429, headers });
    }

    const smtp = await getRuntimeSmtpConfig();
    if (!smtp.user || !smtp.password || !smtp.host || !smtp.port) return NextResponse.json({ error: 'Email verification is not configured. Add SMTP in Admin > API Integrations.' }, { status: 503, headers });

    const code = String(randomInt(100000, 1000000));
    await createVerification(email, code);
    const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: { user: smtp.user, pass: smtp.password },
    });
    try {
        await transporter.sendMail({
            from: `NecrotixLab Digital Footprint <${smtp.user}>`, to: email,
            subject: `${code} - verify your Digital Footprint scan`,
            text: `Your NecrotixLab verification code is ${code}. It expires in 10 minutes. If you did not request this self-audit, ignore this email.`,
            html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;border:1px solid #27272a;border-radius:18px"><p style="font-size:12px;letter-spacing:.16em;color:#71717a">NECROTIXLAB · DIGITAL FOOTPRINT</p><h1 style="font-size:32px;letter-spacing:.12em">${code}</h1><p>This code expires in 10 minutes. If you did not request this self-audit, ignore this email.</p></div>`,
        });
    } catch {
        return NextResponse.json({ error: 'Verification email could not be delivered. Try again later.' }, { status: 503, headers });
    }
    return NextResponse.json({ message: 'Verification code sent.' }, { headers });
}
