import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SidePanel } from './SidePanel';
import { useUIStore } from '@/store/useUIStore';

// Mock the store
vi.mock('@/store/useUIStore');

describe('SidePanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock implementation
        (useUIStore as any).mockReturnValue({
            isPanelOpen: false,
            activeView: 'SETTINGS',
            togglePanel: vi.fn(),
            setActiveView: vi.fn(),
        });
    });

    it('should not be visible when isPanelOpen is false', () => {
        render(<SidePanel />);
        const panel = screen.queryByRole('dialog');
        // It might be in the DOM but hidden, or not in DOM. 
        // For this app, let's assume it renders but is hidden via CSS or null return.
        // Let's assume we want it out of DOM for performance when closed
        expect(panel).not.toBeInTheDocument();
    });

    it('should be visible when isPanelOpen is true', () => {
        (useUIStore as any).mockReturnValue({
            isPanelOpen: true,
            activeView: 'SETTINGS',
            togglePanel: vi.fn(),
        });

        render(<SidePanel />);
        const panel = screen.getByRole('dialog');
        expect(panel).toBeInTheDocument();
        expect(screen.getByText('Global Settings')).toBeInTheDocument();
    });

    it('should have correct ARIA attributes', () => {
        (useUIStore as any).mockReturnValue({
            isPanelOpen: true,
            activeView: 'SETTINGS',
        });

        render(<SidePanel />);
        const panel = screen.getByRole('dialog');
        expect(panel).toHaveAttribute('aria-label', 'Side Panel');
        expect(panel).toHaveAttribute('aria-modal', 'true');
    });
});
