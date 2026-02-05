import { create } from 'zustand';

export type PanelView = 'SETTINGS' | 'DOCS' | 'MIXER' | 'TIMELINE' | 'ASSETS' | 'EXPORT' | 'TOOLS';

interface UIState {
    isPanelOpen: boolean;
    activeView: PanelView;
    togglePanel: () => void;
    setPanelOpen: (isOpen: boolean) => void;
    setActiveView: (view: PanelView) => void;
    openView: (view: PanelView) => void;
}

export const useUIStore = create<UIState>((set) => ({
    isPanelOpen: false,
    activeView: 'SETTINGS',
    
    togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
    
    setPanelOpen: (isOpen) => set({ isPanelOpen: isOpen }),
    
    setActiveView: (view) => set({ activeView: view }),
    
    openView: (view) => set({ 
        activeView: view,
        isPanelOpen: true 
    })
}));
