'use client';

import { useEffect, useState } from 'react';
import { Extension } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Redo2, Undo2 } from 'lucide-react';

const tool = 'inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/65 transition hover:border-white/25 hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-30';
const activeTool = `${tool} border-white/25 bg-white/[0.08] text-white`;

const TextAlignment = Extension.create({
    name: 'textAlignment',
    addGlobalAttributes() {
        return [
            {
                types: ['paragraph', 'heading'],
                attributes: {
                    textAlign: {
                        default: null,
                        parseHTML: (element) => element.style.textAlign || null,
                        renderHTML: (attributes) => attributes.textAlign ? { style: `text-align: ${attributes.textAlign}` } : {},
                    },
                },
            },
        ];
    },
});

type EditorShortcode = {
    label: string;
    value: string;
};

type Props = {
    name: string;
    initialValue?: string;
    poetry?: boolean;
    shortcodes?: EditorShortcode[];
};

type Alignment = 'left' | 'center' | 'right' | 'justify';

export function PostEditor({ name, initialValue = '', poetry = false, shortcodes = [] }: Props) {
    if (poetry) {
        return (
            <textarea
                name={name}
                defaultValue={initialValue}
                rows={22}
                className="min-h-[34rem] w-full whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/[0.025] px-6 py-6 font-serif text-lg leading-8 text-white outline-none focus:border-white/25"
                placeholder="Write the poem exactly as it should appear. Line breaks and stanzas are preserved."
            />
        );
    }

    return <RichEditor name={name} initialValue={initialValue} shortcodes={shortcodes} />;
}

function RichEditor({ name, initialValue, shortcodes }: { name: string; initialValue: string; shortcodes: EditorShortcode[] }) {
    const [html, setHtml] = useState(initialValue);
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [StarterKit, TextAlignment, Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true })],
        content: initialValue || '<p></p>',
        editorProps: {
            attributes: {
                class: 'min-h-[34rem] max-w-none px-6 py-6 outline-none prose prose-invert prose-headings:tracking-tight prose-a:text-sky-300 prose-blockquote:my-6 prose-blockquote:border-l-4 prose-blockquote:border-emerald-400/70 prose-blockquote:bg-emerald-400/[0.04] prose-blockquote:py-2 prose-blockquote:pl-5 prose-blockquote:pr-4 prose-blockquote:text-white/80',
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

    const insertShortcode = (value: string) => {
        if (!editor || !value) return;
        editor.chain().focus().insertContent(`<p>${value}</p>`).run();
    };

    const setAlignment = (alignment: Alignment) => {
        if (!editor) return;
        editor.chain().focus().command(({ tr, state }) => {
            const { from, to } = state.selection;
            let changed = false;
            state.doc.nodesBetween(from, to, (node, pos) => {
                if (node.type.name !== 'paragraph' && node.type.name !== 'heading') return;
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, textAlign: alignment });
                changed = true;
            });
            return changed;
        }).run();
    };

    const currentAlignment = (alignment: Alignment) => editor?.isActive({ textAlign: alignment }) ?? false;

    return (
        <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
            <div className="sticky top-0 z-10 flex min-w-0 flex-wrap gap-2 border-b border-white/10 bg-[#101010]/95 p-3 backdrop-blur-xl">
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
                    className="min-h-8 rounded-md border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white/70 outline-none [color-scheme:dark] [&>option]:bg-[#151515] [&>option]:text-white"
                >
                    <option value="p">Paragraph</option>
                    <option value="h2">Heading 2</option>
                    <option value="h3">Heading 3</option>
                </select>
                <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className={editor?.isActive('bold') ? activeTool : tool}>Bold</button>
                <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className={editor?.isActive('italic') ? activeTool : tool}>Italic</button>
                <button type="button" onClick={() => editor?.chain().focus().toggleStrike().run()} className={editor?.isActive('strike') ? activeTool : tool}>Strike</button>
                <span className="mx-1 h-8 w-px bg-white/10" />
                <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className={editor?.isActive('bulletList') ? activeTool : tool}>Bullets</button>
                <button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={editor?.isActive('orderedList') ? activeTool : tool}>Numbered</button>
                <button type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()} className={editor?.isActive('blockquote') ? activeTool : tool}>Quote</button>
                <button type="button" onClick={() => editor?.chain().focus().toggleCodeBlock().run()} className={editor?.isActive('codeBlock') ? activeTool : tool}>Code</button>
                <button type="button" onClick={setLink} className={editor?.isActive('link') ? activeTool : tool}>Link</button>
                <span className="mx-1 h-8 w-px bg-white/10" />
                <button type="button" title="Align left" aria-label="Align left" onClick={() => setAlignment('left')} className={currentAlignment('left') ? activeTool : tool}><AlignLeft className="h-3.5 w-3.5" /></button>
                <button type="button" title="Align center" aria-label="Align center" onClick={() => setAlignment('center')} className={currentAlignment('center') ? activeTool : tool}><AlignCenter className="h-3.5 w-3.5" /></button>
                <button type="button" title="Align right" aria-label="Align right" onClick={() => setAlignment('right')} className={currentAlignment('right') ? activeTool : tool}><AlignRight className="h-3.5 w-3.5" /></button>
                <button type="button" title="Justify" aria-label="Justify" onClick={() => setAlignment('justify')} className={currentAlignment('justify') ? activeTool : tool}><AlignJustify className="h-3.5 w-3.5" /></button>
                {shortcodes.length > 0 && (
                    <>
                        <span className="mx-1 h-8 w-px bg-white/10" />
                        <select
                            aria-label="Insert content block"
                            defaultValue=""
                            onChange={(event) => {
                                insertShortcode(event.target.value);
                                event.target.value = '';
                            }}
                            className="min-h-8 rounded-md border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-1.5 text-xs text-emerald-200 outline-none [color-scheme:dark] [&>option]:bg-[#151515] [&>option]:text-white"
                        >
                            <option value="" disabled>Insert project block…</option>
                            {shortcodes.map((shortcode) => (
                                <option key={shortcode.value} value={shortcode.value}>{shortcode.label}</option>
                            ))}
                        </select>
                    </>
                )}
                <span className="mx-1 h-8 w-px bg-white/10" />
                <button type="button" title="Undo" disabled={!editor?.can().undo()} onClick={() => editor?.chain().focus().undo().run()} className={tool}><Undo2 className="h-3.5 w-3.5" />Undo</button>
                <button type="button" title="Redo" disabled={!editor?.can().redo()} onClick={() => editor?.chain().focus().redo().run()} className={tool}><Redo2 className="h-3.5 w-3.5" />Redo</button>
                <button type="button" onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()} className={tool}>Clear</button>
            </div>
            <EditorContent editor={editor} />
            <input type="hidden" name={name} value={html} readOnly />
        </div>
    );
}
