import React from 'react';
import ReactMarkdown from 'react-markdown';
import { clsx } from 'clsx';

interface MarkdownViewerProps {
    content: string;
    className?: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, className }) => {
    return (
        <article className={clsx(
            "prose prose-invert prose-slate max-w-none",
            "prose-headings:font-bold prose-headings:text-slate-100",
            "prose-p:text-slate-300",
            "prose-strong:text-white",
            "prose-a:text-primary hover:prose-a:text-primary/80",
            "prose-code:bg-slate-800 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none",
            "prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800",
            className
        )}>
            <ReactMarkdown>{content}</ReactMarkdown>
        </article>
    );
};
