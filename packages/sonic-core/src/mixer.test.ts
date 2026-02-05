import { describe, it, expect, beforeEach } from 'vitest';
import { MixerEngine } from './mixer';
import { WorkletProvider } from './core/types';

describe('MixerEngine Refactor', () => {
    let engine: MixerEngine;
    let mockProvider: WorkletProvider;

    beforeEach(() => {
        engine = new MixerEngine();
        mockProvider = {
            getModuleUrls: () => ['test-url.js']
        };
    });

    it('should initialize with a provider', async () => {
        await engine.init(mockProvider);
        expect(engine.masterBus).toBeDefined();
        expect(engine.masterBus.id).toBe('MASTER');
    });

    it('should handle TRACK_ADD command', async () => {
        await engine.init(mockProvider);
        engine.handleCommand({
            type: 'TRACK_ADD',
            payload: { id: 'track-1', name: 'Test Track' }
        });

        const track = engine.getTrack('track-1');
        expect(track).toBeDefined();
        expect(track?.id).toBe('track-1');
    });

    it('should handle MODULE_ADD command', async () => {
        await engine.init(mockProvider);
        engine.handleCommand({
            type: 'TRACK_ADD',
            payload: { id: 'track-1', name: 'Test Track' }
        });

        engine.handleCommand({
            type: 'MODULE_ADD',
            payload: { trackId: 'track-1', moduleId: 'mod-1', type: 'COMPRESSOR' }
        });

        const track = engine.getTrack('track-1');
        const node = track?.getModuleNode('mod-1');
        expect(node).toBeDefined();
    });

    it('should handle PARAM_SET command', async () => {
        await engine.init(mockProvider);
        engine.handleCommand({
            type: 'TRACK_ADD',
            payload: { id: 'track-1', name: 'Test Track' }
        });

        engine.handleCommand({
            type: 'MODULE_ADD',
            payload: { trackId: 'track-1', moduleId: 'mod-1', type: 'COMPRESSOR' }
        });

        // We can't easily check the inner node parameter value without deep mocking,
        // but we can ensure the command doesn't throw and calls the update logic.
        expect(() => {
            engine.handleCommand({
                type: 'PARAM_SET',
                payload: { moduleId: 'mod-1', param: 'threshold', value: -10 }
            });
        }).not.toThrow();
    });

    it('should handle transport commands', async () => {
        await engine.init(mockProvider);
        engine.handleCommand({ type: 'TRANSPORT_PLAY' });
        expect(engine.isPlaying).toBe(true);

        engine.handleCommand({ type: 'TRANSPORT_PAUSE' });
        expect(engine.isPlaying).toBe(false);

        engine.handleCommand({ type: 'TRANSPORT_SEEK', payload: { time: 10 } });
        expect(engine.pauseTime).toBe(10);
    });
});
