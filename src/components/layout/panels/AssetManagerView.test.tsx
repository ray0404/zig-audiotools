import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssetManagerView } from './AssetManagerView';
import { useAudioStore } from '@/store/useAudioStore';

// Mock audio store
vi.mock('@/store/useAudioStore');

describe('AssetManagerView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should display empty state', () => {
        (useAudioStore as any).mockReturnValue({
            assets: {},
        });
        render(<AssetManagerView />);
        expect(screen.getByText('No assets loaded.')).toBeInTheDocument();
    });

    it('should list loaded assets', () => {
        (useAudioStore as any).mockReturnValue({
            assets: {
                'id-1': { length: 100, duration: 2.5, numberOfChannels: 2 },
                'id-2': { length: 200, duration: 5.0, numberOfChannels: 1 },
            },
        });
        render(<AssetManagerView />);
        
        expect(screen.getByText('Asset 1')).toBeInTheDocument(); // We might mock names or use IDs
        expect(screen.getByText('Asset 2')).toBeInTheDocument();
    });
});
