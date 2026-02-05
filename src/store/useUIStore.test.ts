import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useUIStore } from './useUIStore';

describe('useUIStore', () => {
    beforeEach(() => {
        act(() => {
            useUIStore.setState({
                isPanelOpen: false,
                activeView: 'SETTINGS'
            });
        });
    });

    it('should initialize with default state', () => {
        const state = useUIStore.getState();
        expect(state.isPanelOpen).toBe(false);
        expect(state.activeView).toBe('SETTINGS');
    });

    it('should toggle panel open state', () => {
        act(() => useUIStore.getState().togglePanel());
        expect(useUIStore.getState().isPanelOpen).toBe(true);

        act(() => useUIStore.getState().togglePanel());
        expect(useUIStore.getState().isPanelOpen).toBe(false);
    });

    it('should set panel open state explicitly', () => {
        act(() => useUIStore.getState().setPanelOpen(true));
        expect(useUIStore.getState().isPanelOpen).toBe(true);

        act(() => useUIStore.getState().setPanelOpen(false));
        expect(useUIStore.getState().isPanelOpen).toBe(false);
    });

    it('should set active view', () => {
        act(() => useUIStore.getState().setActiveView('DOCS'));
        expect(useUIStore.getState().activeView).toBe('DOCS');
    });

    it('should open panel when setting view if currently closed', () => {
        // Ensure closed first
        act(() => useUIStore.getState().setPanelOpen(false));
        
        act(() => useUIStore.getState().openView('ASSETS'));
        
        expect(useUIStore.getState().activeView).toBe('ASSETS');
        expect(useUIStore.getState().isPanelOpen).toBe(true);
    });
});
