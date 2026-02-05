import { ContextManager } from "./core/context-manager";
import { TrackStrip } from "./core/track-strip";
import { BusStrip } from "./core/bus-strip";
import { logger } from "@/utils/logger";
import { WorkletProvider } from "./core/types";
import { EngineCommand } from "./protocol";
import { createDefaultModule } from "./core/module-utils";

export class MixerEngine {
    private tracks = new Map<string, TrackStrip>();
    public masterBus!: BusStrip;
    public assets: Record<string, AudioBuffer> = {};

    // Transport
    public isPlaying = false;
    public startTime = 0;
    public pauseTime = 0;

    constructor() {
        // Defer initialization to init()
    }

    async init(provider: WorkletProvider) {
        await ContextManager.init(provider);
        this.masterBus = new BusStrip("MASTER");
        // Master bus output goes to context destination
        this.masterBus.connectTo(ContextManager.context.destination);
        logger.info("Mixer Engine Initialized");
    }

    handleCommand(command: EngineCommand) {
        switch(command.type) {
            case 'TRACK_ADD': 
                this.addTrack(command.payload.id); 
                break;
            case 'TRACK_REMOVE':
                this.removeTrack(command.payload.id);
                break;
            case 'MODULE_ADD': {
                const { trackId, moduleId, type } = command.payload;
                const module = createDefaultModule(type, moduleId);
                if (trackId === 'MASTER') {
                    this.masterBus.addModule(module, this.assets);
                } else {
                    this.getTrack(trackId)?.addModule(module, this.assets);
                }
                break;
            }
            case 'MODULE_REMOVE': {
                const { trackId, moduleId } = command.payload;
                if (trackId === 'MASTER') {
                    this.masterBus.removeModule(moduleId, this.assets);
                } else {
                    this.getTrack(trackId)?.removeModule(moduleId, this.assets);
                }
                break;
            }
            case 'PARAM_SET': {
                const { moduleId, param, value } = command.payload;
                const node = this.getModuleNode(moduleId);
                if (node) {
                    // We need to find WHICH track/bus this module belongs to, to call updateModuleParam on it
                    // Or we can just try all of them? Or access the node directly?
                    // The TrackStrip.updateModuleParam calls NodeFactory.updateParams which handles things.
                    // But MixerEngine.getModuleNode returns the node directly.
                    // Let's use getModuleNode and update directly if possible, or search.
                    
                    // Optimization: NodeFactory knows how to update. 
                    // But NodeFactory needs the module definition? 
                    // No, NodeFactory.updateParams takes a node and a module object (or partial).
                    // We can just create a partial module object.
                    
                    // However, we need to know where the module IS to update state if we want persistence (which we might not in headless).
                    // But TrackStrip needs to know about param update? TrackStrip doesn't store param state separately from _rack.
                    // Wait, TrackStrip._rack DOES store state. We must update _rack too.
                    
                    if (this.masterBus.getModuleNode(moduleId)) {
                        this.masterBus.updateModuleParam(moduleId, param, value, this.assets);
                    } else {
                        for (const track of this.tracks.values()) {
                            if (track.getModuleNode(moduleId)) {
                                track.updateModuleParam(moduleId, param, value, this.assets);
                                break;
                            }
                        }
                    }
                }
                break;
            }
            case 'TRANSPORT_PLAY':
                this.play();
                break;
            case 'TRANSPORT_PAUSE':
                this.pause();
                break;
            case 'TRANSPORT_SEEK':
                this.seek(command.payload.time);
                break;
        }
    }

    get context() {
        return ContextManager.context;
    }

    addTrack(id: string): TrackStrip {
        if (this.tracks.has(id)) return this.tracks.get(id)!;

        const track = new TrackStrip(id);
        // By default, track connects to Master Bus
        track.connectTo(this.masterBus.inputGain);

        this.tracks.set(id, track);
        return track;
    }

    removeTrack(id: string) {
        const track = this.tracks.get(id);
        if (track) {
            track.disconnect();
            this.tracks.delete(id);
        }
    }

    getTrack(id: string) {
        return this.tracks.get(id);
    }

    getAllTracks() {
        return Array.from(this.tracks.values());
    }

    play() {
        if (this.isPlaying) return;
        ContextManager.resume();

        const ctx = ContextManager.context;
        this.startTime = ctx.currentTime - this.pauseTime;

        this.tracks.forEach(track => {
            track.play(0, this.pauseTime);
        });

        this.isPlaying = true;
    }

    pause() {
        if (!this.isPlaying) return;

        const ctx = ContextManager.context;
        this.pauseTime = ctx.currentTime - this.startTime;

        this.tracks.forEach(track => track.stop());
        this.isPlaying = false;
    }

    seek(time: number) {
        const wasPlaying = this.isPlaying;
        if (wasPlaying) this.pause();
        this.pauseTime = time;
        if (wasPlaying) this.play();
    }

    get currentTime() {
        if (this.isPlaying && ContextManager.context) {
            return ContextManager.context.currentTime - this.startTime;
        }
        return this.pauseTime;
    }

    resume() {
        ContextManager.resume();
    }

    getModuleNode(moduleId: string) {
        // Check Master
        let node = this.masterBus.getModuleNode(moduleId);
        if (node) return node;

        // Check Tracks
        for (const track of this.tracks.values()) {
            node = track.getModuleNode(moduleId);
            if (node) return node;
        }
        return undefined;
    }

    getRMSLevel(): { input: number, output: number } {
        const analyser = this.masterBus.analyser;
        if (!analyser) return { input: -100, output: -100 };

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);
        analyser.getFloatTimeDomainData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / bufferLength);
        const db = 20 * Math.log10(Math.max(rms, 0.00001));

        return { input: db, output: db };
    }
}
