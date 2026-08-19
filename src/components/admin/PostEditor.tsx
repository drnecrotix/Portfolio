'use client';

import { useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';

export function PostEditor({ name, initialValue = '', poetry = false }: { name: string; initialValue?: string; poetry?: boolean }) {
    if (poetry) {
        return (
            <textarea
                name={name}
                defaultValue={initialValue}
                rows={18}
                className="min-h-[28rem] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 font-serif text-lg leading-8 text-white outline-none focus:border-white/25 whitespace-pre-wrap"
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
        extensions: [StarterKit, Link.configure({ openOnClick: false })],
        content: initialValue || '<p></p>',
        editorProps: {
            attributes: {
                class: 'min-h-[28rem] px-4 py-4 outline-none prose prose-invert max-w-none',
            },
        },
        onUpdate: ({ editor }) => setHtml(editor.getHTML()),
    });

    useEffect(() => {
        if (editor && initialValue && editor.getHTML() !== initialValue) {
            editor.commands.setContent(initialValue);
        }
    }, [editor, initialValue]);

    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
            <div className="flex flex-wrap gap-2 border-b border-white/10 p-3">
                <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className="rounded-md border border-white/10 px-3 py-1.5 text-xs">Bold</button>
                <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className="rounded-md border border-white/10 px-3 py-1.5 text-xs">Italic</button>
                <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className="rounded-md border border-white/10 px-3 py-1.5 text-xs">H2</button>
                <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className="rounded-md border border-white/10 px-3 py-1.5 text-xs">List</button>
                <button type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()} className="rounded-md border border-white/10 px-3 py-1.5 text-xs">Quote</button>
            </div>
            <EditorContent editor={editor} />
            <input type="hidden" name={name} value={html} readOnly />
        </div>
    );
}
