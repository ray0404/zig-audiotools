import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDocumentation } from './useDocumentation';

// Mock fetch
global.fetch = vi.fn();

describe('useDocumentation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch documentation content', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            text: async () => '# Test Doc',
        });

        const { result } = renderHook(() => useDocumentation('guide'));

        await waitFor(() => expect(result.current.content).toBe('# Test Doc'));
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('should handle fetch errors', async () => {
        (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

        const { result } = renderHook(() => useDocumentation('invalid'));

        await waitFor(() => expect(result.current.error).toBe('Failed to load documentation'));
        expect(result.current.isLoading).toBe(false);
        expect(result.current.content).toBe('');
    });
});
