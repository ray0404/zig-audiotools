import React from 'react';
import { useUIStore } from '@/store/useUIStore';
import { twMerge } from 'tailwind-merge';
import { NavMenu } from './nav/NavMenu';
import { SettingsView } from './panels/SettingsView';
import { AssetManagerView } from './panels/AssetManagerView';
import { ExportView } from './panels/ExportView';
import { ToolsView } from './panels/ToolsView';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export const SidePanel: React.FC = () => {
    const { isPanelOpen, activeView, setPanelOpen } = useUIStore();

    // Title mapping based on view
    const titles: Record<string, string> = {
        'SETTINGS': 'Global Settings',
        'DOCS': 'Documentation',
        'MIXER': 'Mixer',
        'TIMELINE': 'Timeline',
        'ASSETS': 'Asset Manager',
        'EXPORT': 'Export',
        'TOOLS': 'Smart Tools'
    };

    const renderContent = () => {
        switch (activeView) {
            case 'SETTINGS': return <SettingsView />;
            case 'ASSETS': return <AssetManagerView />;
            case 'EXPORT': return <ExportView />;
            case 'TOOLS': return <ToolsView />;
            default:
                return (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50">
                        <p>This view is under construction.</p>
                    </div>
                );
        }
    };

    return (
        <AnimatePresence>
            {isPanelOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setPanelOpen(false)}
                        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 md:hidden"
                    />

                    {/* Panel */}
                    <motion.div 
                        role="dialog" 
                        aria-label="Side Panel" 
                        aria-modal="true"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className={twMerge(
                            "fixed inset-y-0 right-0 w-full md:w-[400px] z-50",
                            "bg-slate-900/90 backdrop-blur-xl border-l border-slate-700",
                            "shadow-2xl flex flex-col",
                            "text-slate-100"
                        )}
                    >
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                            <h2 className="text-xl font-bold tracking-tight">{titles[activeView] || 'Panel'}</h2>
                            <button 
                                onClick={() => setPanelOpen(false)}
                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                                aria-label="Close Panel"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-slate-700 bg-slate-900/30">
                                <NavMenu />
                            </div>
                            
                            <div className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                                {renderContent()}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
