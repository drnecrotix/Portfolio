'use client';

import { useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';

const tool = 'rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/65 transition hover:border-white/25 hover:bg-white/[0.05] hover:text-white disabled:opacity-30';

export function PostEditor({ name, initialValue = '', poetry = false }: { name: string; initialValue?: string; poetry?: boolean }) {
    if (poetry) {
        return (
            <textarea
                name={name}
                defaultValue={initialValue}
                rows={22}
                className="min-h-[34rem] w-full rounded-2xl border border-white/10 bg-white/[0.025] px-6 py-6 font-serif text-lg leading-8 text-white outline-none focus:border-white/25 whitespace-pre-wrap"
                placeholder="Write the poem exactly as it should appear. Line breaks and stanzas are preserved."
            />
        );
    }

    return <RichEditor name={name} initialValue={initialValue} />;
}

function RichEditor({ name, initialValue }: { name: string; initialValue: string }) {
    const [html, setHtml] = useState(initialValue);
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [StarterKit, Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true })],
        content: initialValue || '<p></p>',
        editorProps: {
            attributes: {
                class: 'min-h-[34rem] px-6 py-6 outline-none prose prose-invert prose-headings:tracking-tight prose-a:text-sky-300 max-w-none',
            },
        },
        onUpdate: ({ editor }) => setHtml(editor.getHTML()),
    });

    useEffect(() => {
        if (editor && initialValue && editor.getHTML() !== initialValue) editor.commands.setContent(initialValue);
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
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
            <div className="sticky top-0 z-10 flex flex-wrap gap-2 border-b border-white/10 bg-[#101010]/95 p-3 backdrop-blur-xl">
                <select
                    aria-label="Text style"
                    value={editor?.isActive('heading', { level: 2 }) ? 'h2' : editor?.isActive('heading', { level: 3 }) ? 'h3' : 'p'}
                    onChange={(event) => {
                        if (!editor) return;
                        const value = event.target.value;
                        if (value === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
                        else if (value === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
                        else editor.chain().focus().setParagraph().run();
                    }}
                    className="rounded-md border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white/70 outline-none"
                >
                    <option value="p">Paragraph</option>
                    <option value="h2">Heading 2</option>
                    <option value="h3">Heading 3</option>
                </select>
                <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className={tool}>Bold</button>
                <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className={tool}>Italic</button>
                <button type="button" onClick={() => editor?.chain().focus().toggleStrike().run()} className={tool}>Strike</button>
                <span className="mx-1 h-7 w-px bg-white/10" />
                <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className={tool}>Bullets</button>
                <button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={tool}>Numbered</button>
                <button type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()} className={tool}>Quote</button>
                <button type="button" onClick={() => editor?.chain().focus().toggleCodeBlock().run()} className={tool}>Code</button>
                <button type="button" onClick={setLink} className={tool}>Link</button>
                <span className="mx-1 h-7 w-px bg-white/10" />
                <button type="button" disabled={!editor?.can().undo()} onClick={() => editor?.chain().focus().undo().run()} className={tool}>Undo</button>
                <button type="button" disabled={!editor?.can().redo()} onClick={() => editor?.chain().focus().redo().run()} className={tool}>Redo</button>
                <button type="button" onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()} className={tool}>Clear</button>
            </div>
            <EditorContent editor={editor} />
            <input type="hidden" name={name} value={html} readOnly />
        </div>
    );
}
