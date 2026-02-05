import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePanelRouting } from './usePanelRouting';
import { useUIStore } from '@/store/useUIStore';

// Mock store
vi.mock('@/store/useUIStore', () => ({
    useUIStore: vi.fn(),
}));

describe('usePanelRouting', () => {
    const openView = vi.fn();
    const setPanelOpen = vi.fn();
    const originalLocation = window.location;

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock default store state
        (useUIStore as any).mockReturnValue({
            isPanelOpen: false,
            activeView: 'SETTINGS',
            openView,
            setPanelOpen,
        });

        // Mock window.location
        delete (window as any).location;
        (window as any).location = {
            search: '',
            pathname: '/',
        };
        
        // Mock history
        window.history.pushState = vi.fn();
        window.history.replaceState = vi.fn();
    });

    afterEach(() => {
        // Restore location
        delete (window as any).location;
        (window as any).location = originalLocation;
    });

    it('should update URL when panel opens', () => {
        // Mock store state change: Panel Open, View DOCS
        (useUIStore as any).mockReturnValue({
            isPanelOpen: true,
            activeView: 'DOCS',
            openView,
            setPanelOpen,
        });

        renderHook(() => usePanelRouting());

        expect(window.history.replaceState).toHaveBeenCalledWith(
            expect.anything(),
            '',
            expect.stringContaining('view=DOCS')
        );
    });

    it('should clear URL param when panel closes', () => {
        // Setup initial URL
        window.location.search = '?view=SETTINGS';
        
        // Mock store state change: Panel Closed
        (useUIStore as any).mockReturnValue({
            isPanelOpen: false,
            activeView: 'SETTINGS',
            openView,
            setPanelOpen,
        });

        renderHook(() => usePanelRouting());

        expect(window.history.replaceState).toHaveBeenCalledWith(
            expect.anything(),
            '',
            expect.not.stringContaining('view=')
        );
    });

    it('should sync from URL to store on mount', () => {
        // Setup initial URL
        window.location.search = '?view=ASSETS';
        
        // Default store (Closed)
        (useUIStore as any).mockReturnValue({
            isPanelOpen: false,
            activeView: 'SETTINGS',
            openView,
            setPanelOpen,
        });

        renderHook(() => usePanelRouting());

        expect(openView).toHaveBeenCalledWith('ASSETS');
    });
});