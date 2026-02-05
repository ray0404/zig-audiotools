import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsView } from './SettingsView';
import { useAudioStore } from '@/store/useAudioStore';

// Mock audio store
vi.mock('@/store/useAudioStore');

describe('SettingsView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useAudioStore as any).mockReturnValue({
            isInitialized: true,
            master: { volume: 0.8 },
            setTrackVolume: vi.fn(),
        });
    });

    it('should render settings controls', () => {
        render(<SettingsView />);
        expect(screen.getByText('Audio Engine')).toBeInTheDocument();
        expect(screen.getByText('Master Volume')).toBeInTheDocument();
    });

    it('should show engine status', () => {
        render(<SettingsView />);
        expect(screen.getByText('Active')).toBeInTheDocument(); // Based on isInitialized: true
    });
});
