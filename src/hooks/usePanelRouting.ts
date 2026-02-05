import { useEffect } from 'react';
import { useUIStore, PanelView } from '@/store/useUIStore';

export const usePanelRouting = () => {
    const { isPanelOpen, activeView, openView, setPanelOpen } = useUIStore();

    // 1. Sync Store -> URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        
        if (isPanelOpen) {
            if (params.get('view') !== activeView) {
                params.set('view', activeView);
                const newUrl = `${window.location.pathname}?${params.toString()}`;
                window.history.replaceState({}, '', newUrl);
            }
        } else {
            if (params.has('view')) {
                params.delete('view');
                const newUrl = params.toString() 
                    ? `${window.location.pathname}?${params.toString()}`
                    : window.location.pathname;
                window.history.replaceState({}, '', newUrl);
            }
        }
    }, [isPanelOpen, activeView]);

    // 2. Sync URL -> Store (on Mount and PopState)
    useEffect(() => {
        const handleUrlChange = () => {
            const params = new URLSearchParams(window.location.search);
            const viewParam = params.get('view');
            
            if (viewParam) {
                // Validate if it's a valid view type? 
                // For now, assume strict typing isn't enforceable on raw URL strings without a guard
                openView(viewParam as PanelView);
            } else {
                setPanelOpen(false);
            }
        };

        // Initial check
        handleUrlChange();

        // Listen for back/forward navigation
        window.addEventListener('popstate', handleUrlChange);
        
        return () => {
            window.removeEventListener('popstate', handleUrlChange);
        };
    }, [openView, setPanelOpen]);
};
