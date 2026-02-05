import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NavMenu } from './NavMenu';
import { useUIStore } from '@/store/useUIStore';

// Mock store
vi.mock('@/store/useUIStore');

describe('NavMenu', () => {
    const setActiveView = vi.fn();
    
    beforeEach(() => {
        vi.clearAllMocks();
        (useUIStore as any).mockReturnValue({
            activeView: 'SETTINGS',
            setActiveView,
        });
    });

    it('should render all navigation items', () => {
        render(<NavMenu />);
        
        expect(screen.getByText('Settings')).toBeInTheDocument();
        expect(screen.getByText('Documentation')).toBeInTheDocument();
        expect(screen.getByText('Mixer')).toBeInTheDocument();
        expect(screen.getByText('Assets')).toBeInTheDocument();
        expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('should highlight the active view', () => {
        (useUIStore as any).mockReturnValue({
            activeView: 'ASSETS',
            setActiveView,
        });

        render(<NavMenu />);
        
        const assetsButton = screen.getByText('Assets').closest('button');
        const settingsButton = screen.getByText('Settings').closest('button');

        expect(assetsButton).toHaveAttribute('aria-current', 'page');
        expect(settingsButton).not.toHaveAttribute('aria-current');
    });

    it('should change view on click', () => {
        render(<NavMenu />);
        
        fireEvent.click(screen.getByText('Mixer'));
        expect(setActiveView).toHaveBeenCalledWith('MIXER');
    });
});
