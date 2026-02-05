import React, { useRef } from 'react';
import { useUIStore, PanelView } from '@/store/useUIStore';
import { useAudioStore } from '@/store/useAudioStore';
import { Settings, BookOpen, Sliders, Library, Download, Wand2, FolderOpen, Save } from 'lucide-react';
import { clsx } from 'clsx';
import { ProjectPackager } from '@/services/ProjectPackager';
import { ProjectLoader } from '@/services/ProjectLoader';
import { logger } from '@/utils/logger';

const NAV_ITEMS: { id: PanelView; label: string; icon: React.ElementType; href?: string }[] = [
    { id: 'TOOLS', label: 'Smart Tools', icon: Wand2 },
    { id: 'SETTINGS', label: 'Settings', icon: Settings },
    { id: 'DOCS', label: 'Documentation', icon: BookOpen, href: '/docs/index.html' },
    { id: 'MIXER', label: 'Mixer', icon: Sliders },
    { id: 'ASSETS', label: 'Assets', icon: Library },
    { id: 'EXPORT', label: 'Export', icon: Download },
];

export const NavMenu: React.FC = () => {
    const { activeView, setActiveView } = useUIStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSave = async () => {
        try {
            const state = useAudioStore.getState();
            await ProjectPackager.exportProject(state, "SonicForge_Project");
        } catch (e) {
            logger.error("Failed to export project", e);
            alert("Failed to save project. Check console.");
        }
    };

    const handleOpenClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            await ProjectLoader.importProject(file);
        } catch (error) {
            logger.error("Failed to import project", error);
            alert("Failed to load project. Check console.");
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <nav className="flex flex-col gap-2 p-2 h-full">
            {/* Project Actions */}
            <div className="mb-2 border-b border-slate-700 pb-2 space-y-1">
                <button
                    onClick={handleOpenClick}
                    className="flex w-full items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                >
                    <FolderOpen size={18} />
                    <span>Open Project</span>
                </button>
                <button
                    onClick={handleSave}
                    className="flex w-full items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                >
                    <Save size={18} />
                    <span>Save Project</span>
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept=".sfg,.zip" 
                    className="hidden" 
                />
            </div>

            {NAV_ITEMS.map((item) => {
                if (item.href) {
                    return (
                        <a
                            key={item.id}
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                        >
                            <item.icon size={18} />
                            <span>{item.label}</span>
                        </a>
                    );
                }

                return (
                    <button
                        key={item.id}
                        onClick={() => setActiveView(item.id)}
                        aria-current={activeView === item.id ? 'page' : undefined}
                        className={clsx(
                            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium",
                            activeView === item.id
                                ? "bg-primary text-white shadow-lg shadow-primary/20"
                                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                        )}
                    >
                        <item.icon size={18} />
                        <span>{item.label}</span>
                    </button>
                );
            })}
        </nav>
    );
};
