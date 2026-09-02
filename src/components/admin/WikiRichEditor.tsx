'use client';

import { useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Redo2, Undo2 } from 'lucide-react';

const tool = 'inline-flex min-h-8 items-center justify-center rounded-md border border-foreground/10 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:bg-foreground/[0.04] hover:text-foreground disabled:opacity-30';
const active = `${tool} bg-foreground/[0.07] text-foreground`;

export function WikiRichEditor({
    name,
    initialValue = '',
    onChange,
    minHeight = 'min-h-48',
}: {
    name: string;
    initialValue?: string;
    onChange?: (value: string) => void;
    minHeight?: string;
}) {
    const [html, setHtml] = useState(initialValue);
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [StarterKit, Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true })],
        content: initialValue || '<p></p>',
        editorProps: {
            attributes: {
                class: `${minHeight} max-w-none px-4 py-4 outline-none prose prose-sm prose-invert prose-headings:tracking-tight prose-a:text-sky-300 prose-a:underline-offset-4 prose-blockquote:border-l-2 prose-blockquote:border-foreground/25 prose-blockquote:pl-4 prose-blockquote:text-foreground/75 prose-code:before:content-none prose-code:after:content-none`,
            },
        },
        onUpdate: ({ editor: current }) => {
            const value = current.getHTML();
            setHtml(value);
            onChange?.(value);
        },
    });

    useEffect(() => {
        if (!editor || editor.getHTML() === initialValue) return;
        editor.commands.setContent(initialValue || '<p></p>');
    }, [editor, initialValue]);

    const setLink = () => {
        if (!editor) return;
        const previous = editor.getAttributes('link').href as string | undefined;
        const url = window.prompt('Link URL', previous || 'https://');
        if (url === null) return;
        if (!url.trim()) editor.chain().focus().extendMarkRange('link').unsetLink().run();
        else editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
    };

    return (
        <div className="min-w-0 overflow-hidden rounded-xl border border-foreground/10 bg-background/60">
            <div className="border-b border-foreground/10 bg-background/95 px-2.5 py-2 backdrop-blur">
                <div className="flex flex-wrap gap-1.5">
                    <select
                        aria-label="Text style"
                        value={editor?.isActive('heading', { level: 2 }) ? 'h2' : editor?.isActive('heading', { level: 3 }) ? 'h3' : editor?.isActive('heading', { level: 4 }) ? 'h4' : 'p'}
                        onChange={(event) => {
                            const value = event.target.value;
                            if (value === 'h2') editor?.chain().focus().setHeading({ level: 2 }).run();
                            else if (value === 'h3') editor?.chain().focus().setHeading({ level: 3 }).run();
                            else if (value === 'h4') editor?.chain().focus().setHeading({ level: 4 }).run();
                            else editor?.chain().focus().setParagraph().run();
                        }}
                        className="min-h-8 rounded-md border border-foreground/10 bg-background px-2.5 text-[11px] text-foreground outline-none"
                    >
                        <option value="p">Paragraph</option>
                        <option value="h2">Heading 2</option>
                        <option value="h3">Heading 3</option>
                        <option value="h4">Heading 4</option>
                    </select>
                    <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className={editor?.isActive('bold') ? active : tool}>Bold</button>
                    <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className={editor?.isActive('italic') ? active : tool}>Italic</button>
                    <button type="button" onClick={() => editor?.chain().focus().toggleStrike().run()} className={editor?.isActive('strike') ? active : tool}>Strike</button>
                    <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className={editor?.isActive('bulletList') ? active : tool}>Bullets</button>
                    <button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={editor?.isActive('orderedList') ? active : tool}>Numbered</button>
                    <button type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()} className={editor?.isActive('blockquote') ? active : tool}>Quote</button>
                    <button type="button" onClick={() => editor?.chain().focus().toggleCode().run()} className={editor?.isActive('code') ? active : tool}>Code</button>
                    <button type="button" onClick={() => editor?.chain().focus().toggleCodeBlock().run()} className={editor?.isActive('codeBlock') ? active : tool}>Code block</button>
                    <button type="button" onClick={() => editor?.chain().focus().setHorizontalRule().run()} className={tool}>Divider</button>
                    <button type="button" onClick={setLink} className={editor?.isActive('link') ? active : tool}>Link</button>
                    {editor?.isActive('link') ? <button type="button" onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()} className={tool}>Unlink</button> : null}
                    <button type="button" onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} className={tool}><Undo2 className="mr-1 size-3.5" />Undo</button>
                    <button type="button" onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} className={tool}><Redo2 className="mr-1 size-3.5" />Redo</button>
                    <button type="button" onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()} className={tool}>Clear</button>
                </div>
            </div>
            <EditorContent editor={editor} />
            <input type="hidden" name={name} value={html} readOnly />
        </div>
    );
}
