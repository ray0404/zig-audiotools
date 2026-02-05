import React, { useState, useRef } from 'react';
import { Save, AlertTriangle, Layers, Activity, FileAudio, Menu, X } from 'lucide-react';
import { useProjectPersistence } from '@/hooks/useProjectPersistence';
import { useAudioStore } from '@/store/useAudioStore';
import { useUIStore } from '@/store/useUIStore';
import { usePanelRouting } from '@/hooks/usePanelRouting';
import { EffectsRack } from '@/components/rack/EffectsRack';
import { Transport } from '@/components/Transport';
import { MixerView } from '@/components/mixer/MixerView';
import { AddModuleMenu } from '@/components/rack/AddModuleMenu';
import { SidePanel } from './SidePanel';
import { clsx } from 'clsx';

type Tab = 'rack' | 'mixer';

export const MasteringWorkspace: React.FC = () => {
  const { saveProject, isPersistedToDisk } = useProjectPersistence();
  const { loadSourceFile, activeTrackId, tracks, addTrack } = useAudioStore();
  const { isPanelOpen, togglePanel } = useUIStore();
  
  // Enable URL <-> Store synchronization
  usePanelRouting();
  
  const [activeTab, setActiveTab] = useState<Tab>('rack');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeTrack = tracks[activeTrackId];

  const handleSave = async () => {
      await saveProject();
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (activeTrackId === 'MASTER') {
              // Create new track for file
              addTrack(file.name.replace(/\.[^/.]+$/, ""));
              // We need to wait for state update to get ID?
              // addModule updates sync. But we don't know the ID here easily without return.
              // useAudioStore addTrack doesn't return ID.
              // For now, let's just let user add track first or select a track.
              // Or better, addTrack sets activeTrackId.
              // But we can't call loadSourceFile immediately on the new ID because of closure.
              // The user will see the new track and can import again.
              // Alternatively, update store to accept file in addTrack.
              // For now: Only load if track selected.
              alert("Please select a track (not Master) to load audio.");
          } else {
              loadSourceFile(activeTrackId, file);
          }
      }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-slate-200 overflow-hidden font-sans">
        {/* === HEADER === */}
        <header className="shrink-0 flex items-center justify-between px-4 py-3 bg-surface border-b border-slate-700 shadow-lg z-[60] relative">
             <div className="flex items-center gap-3 shrink-0">
                 <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-lg shadow-inner flex items-center justify-center">
                    <Activity size={18} className="text-white mix-blend-overlay" />
                 </div>
                 <div className="leading-tight">
                     <h1 className="text-sm font-bold tracking-tight text-slate-100">Sonic Forge</h1>
                     <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Multi-Track</span>
                 </div>
             </div>

             <div className="flex items-center gap-3 justify-end flex-1 min-w-0">
                 {!isPersistedToDisk && (
                     <div className="hidden sm:flex items-center gap-1 text-amber-500 bg-amber-900/20 px-2 py-0.5 rounded text-[10px] border border-amber-500/20 animate-pulse shrink-0">
                         <AlertTriangle size={10} />
                         <span>Unsaved</span>
                     </div>
                 )}
                 <button
                   onClick={handleSave}
                   className="p-2 sm:px-3 sm:py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-xs font-bold transition-all border border-slate-700 flex items-center gap-2 shrink-0"
                   title="Save Project"
                 >
                     <Save size={16} className="sm:w-3 sm:h-3" />
                     <span className="hidden sm:inline">Save</span>
                 </button>

                 <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 overflow-hidden shrink-0">
                    <button
                        onClick={handleImportClick}
                        className="p-2 sm:px-3 sm:py-1.5 hover:bg-slate-700 active:bg-slate-600 text-xs font-bold transition-all flex items-center gap-2 border-r border-slate-700"
                        title="Import Audio"
                    >
                        <FileAudio size={16} className="sm:w-3 sm:h-3" />
                        <span className="hidden sm:inline">Audio</span>
                    </button>
                    {/* Clear Source removed for now as it's per track */}
                 </div>

                 <input 
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleFileChange}
                 />

                 <div className="h-6 w-px bg-slate-700 mx-1 hidden sm:block shrink-0"></div>
                 <AddModuleMenu />
                 
                 <div className="h-6 w-px bg-slate-700 mx-1 shrink-0"></div>
                 <button
                    onClick={togglePanel}
                    className={clsx(
                        "p-2 rounded-lg transition-all shrink-0",
                        isPanelOpen ? "bg-primary text-white shadow-glow" : "text-slate-400 hover:text-white hover:bg-slate-800"
                    )}
                 >
                    {isPanelOpen ? <X size={20} /> : <Menu size={20} />}
                 </button>
             </div>
        </header>

        {/* === MAIN CONTENT (Desktop Grid / Mobile Flex) === */}
        <div className="flex-1 relative overflow-hidden flex">
            
            {/* Main Workspace Area - Pushes on Desktop */}
            <main className={clsx(
                "flex-1 flex flex-col h-full transition-all duration-300 ease-in-out overflow-hidden",
                // Desktop Push Logic: Add margin right when panel is open
                isPanelOpen ? "md:mr-[400px]" : "md:mr-0"
            )}>
                {/* Desktop: Grid Layout */}
                <div className="hidden md:grid h-full grid-rows-[1fr_300px]">
                    {/* Rack Area */}
                    <div className="overflow-y-auto p-8 bg-rack-bg scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900/50">
                        <div className="max-w-5xl mx-auto pb-10">
                             <div className="mb-4 text-sm font-bold text-slate-400">
                                 {activeTrackId === 'MASTER' ? "Master Bus Effects" : `Track Effects: ${activeTrack?.name || 'Unknown'}`}
                             </div>
                             <EffectsRack />
                        </div>
                    </div>
                    
                    {/* Bottom Section: Transport & Mixer */}
                    <div className="bg-surface border-t border-slate-700 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-40">
                        <div className="px-4 py-2 bg-background border-b border-slate-800 flex justify-center shadow-inner">
                            <Transport />
                        </div>
                        <div className="flex-1 p-0 bg-background overflow-hidden">
                            <MixerView />
                        </div>
                    </div>
                </div>

                {/* Mobile: Tabbed Layout */}
                <div className="md:hidden h-full flex flex-col">
                    <div className="flex-1 overflow-hidden relative">
                        {/* Rack Tab */}
                        <div className={clsx(
                            "absolute inset-0 overflow-y-auto bg-rack-bg p-4 pb-24 transition-opacity duration-300",
                            activeTab === 'rack' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                        )}>
                             <div className="mb-4 text-xs font-bold text-slate-400">
                                 {activeTrackId === 'MASTER' ? "Master Bus" : activeTrack?.name}
                             </div>
                            <EffectsRack />
                        </div>
                        
                        {/* Mixer Tab */}
                        <div className={clsx(
                            "absolute inset-0 bg-background p-2 flex flex-col gap-4 transition-opacity duration-300",
                            activeTab === 'mixer' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                        )}>
                            <MixerView />
                        </div>
                    </div>

                    {/* Mobile Bottom Bar: Transport + Tabs */}
                    <div className="shrink-0 bg-surface border-t border-slate-700 pb-safe z-50">
                         {/* Mini Transport */}
                         <div className="px-2 py-2 bg-background border-b border-slate-800 flex justify-center">
                             <Transport />
                         </div>
                         
                         {/* Tab Bar */}
                         <div className="flex h-12">
                             <button 
                                onClick={() => setActiveTab('rack')}
                                className={clsx(
                                    "flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wide transition-colors relative",
                                    activeTab === 'rack' ? "text-primary bg-slate-800" : "text-slate-500 hover:bg-slate-800/50"
                                )}
                             >
                                <Layers size={18} />
                                Rack
                                {activeTab === 'rack' && <div className="absolute top-0 left-0 w-full h-0.5 bg-primary shadow-[0_0_10px_rgba(59,130,246,0.8)]" />}
                             </button>
                             
                             <div className="w-px bg-slate-800 my-2"></div>

                             <button 
                                onClick={() => setActiveTab('mixer')}
                                className={clsx(
                                    "flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wide transition-colors relative",
                                    activeTab === 'mixer' ? "text-primary bg-slate-800" : "text-slate-500 hover:bg-slate-800/50"
                                )}
                             >
                                <Activity size={18} />
                                Mixer
                                {activeTab === 'mixer' && <div className="absolute top-0 left-0 w-full h-0.5 bg-primary shadow-[0_0_10px_rgba(59,130,246,0.8)]" />}
                             </button>
                         </div>
                    </div>
                </div>
            </main>

            {/* Global Side Panel */}
            <SidePanel />
        </div>
    </div>
  );
};
