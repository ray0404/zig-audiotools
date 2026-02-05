import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MarkdownViewer } from './MarkdownViewer';

describe('MarkdownViewer', () => {
    it('should render markdown content as HTML', () => {
        const content = '# Hello World\nThis is **bold** text.';
        render(<MarkdownViewer content={content} />);
        
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hello World');
        // Check for strong tag
        expect(screen.getByText('bold').tagName).toBe('STRONG');
    });

    it('should handle empty content', () => {
        render(<MarkdownViewer content="" />);
        expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });
});
