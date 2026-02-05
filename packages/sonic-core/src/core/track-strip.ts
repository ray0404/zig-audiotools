import {
    IAudioContext,
    IGainNode,
    IAudioNode,
    IAudioBufferSourceNode,
    IOfflineAudioContext,
    IStereoPannerNode,
    IAnalyserNode
} from "standardized-audio-context";
import { ContextManager } from "./context-manager";
import type { RackModule } from "../types";
import { NodeFactory } from "./node-factory";
import { ConvolutionNode } from "../worklets/ConvolutionNode";

export class TrackStrip {
    public id: string;
    public context: IAudioContext | IOfflineAudioContext;
    public inputGain: IGainNode<IAudioContext | IOfflineAudioContext>;
    public outputGain: IGainNode<IAudioContext | IOfflineAudioContext>; // Fader
    public panner: IStereoPannerNode<IAudioContext | IOfflineAudioContext>;
    public analyser: IAnalyserNode<IAudioContext | IOfflineAudioContext>;

    public sourceNode: IAudioBufferSourceNode<IAudioContext | IOfflineAudioContext> | null = null;
    public sourceBuffer: AudioBuffer | null = null;

    // Rack State
    private nodeMap = new Map<string, IAudioNode<IAudioContext | IOfflineAudioContext> | ConvolutionNode>();
    private connectedIds: string[] = [];
    private _rack: RackModule[] = [];

    private isPlaying: boolean = false;

    constructor(id: string, context?: IAudioContext | IOfflineAudioContext) {
        this.id = id;
        this.context = context || ContextManager.context;
        const ctx = this.context;

        this.inputGain = ctx.createGain();
        this.outputGain = ctx.createGain();
        this.panner = ctx.createStereoPanner();
        this.analyser = ctx.createAnalyser();

        // Initial chain: Input -> Output -> Analyser -> Panner
        this.inputGain.connect(this.outputGain as any);
        this.outputGain.connect(this.analyser as any);
        this.analyser.connect(this.panner as any);

        // Default Params
        this.outputGain.gain.value = 1.0;
        this.panner.pan.value = 0;
    }

    get outputNode(): IAudioNode<IAudioContext | IOfflineAudioContext> {
        return this.panner as unknown as IAudioNode<IAudioContext | IOfflineAudioContext>;
    }

    connectTo(destination: IAudioNode<IAudioContext | IOfflineAudioContext>) {
        this.outputNode.connect(destination as any);
    }

    disconnect() {
        this.outputNode.disconnect();
        this.fullRebuildGraph([], {});
    }

    setSource(buffer: AudioBuffer) {
        this.sourceBuffer = buffer;
    }

    play(when: number, offset: number = 0) {
        if (!this.sourceBuffer) return;
        // If already playing, stop first? Or just let it overlay? Usually stop.
        if (this.isPlaying) this.stop();

        const ctx = this.context;
        this.sourceNode = ctx.createBufferSource();
        this.sourceNode.buffer = this.sourceBuffer;
        this.sourceNode.connect(this.inputGain as any);

        this.sourceNode.start(when, offset);
        this.isPlaying = true;

        this.sourceNode.onended = () => {
            this.isPlaying = false;
        };
    }

    stop() {
        if (this.sourceNode) {
            try {
                this.sourceNode.stop();
            } catch(e) {
                // Ignore errors if already stopped
            }
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }
        this.isPlaying = false;
    }

    setVolume(value: number) {
        const ctx = this.context;
        this.outputGain.gain.setTargetAtTime(value, ctx.currentTime, 0.01);
    }

    setPan(value: number) {
        const ctx = this.context;
        this.panner.pan.setTargetAtTime(value, ctx.currentTime, 0.01);
    }

    // --- Rack Management ---

    updateRack(rack: RackModule[], assets: Record<string, AudioBuffer>) {
        this._rack = rack;
        const nextActiveModules = rack.filter(m => !m.bypass);
        const nextIds = nextActiveModules.map(m => m.id);

        // 1. Find the first point of difference
        let firstMismatchIndex = -1;
        const len = Math.max(this.connectedIds.length, nextIds.length);
        for (let i = 0; i < len; i++) {
            if (this.connectedIds[i] !== nextIds[i]) {
                firstMismatchIndex = i;
                break;
            }
        }

        // 2. If no structural changes, just sync params
        if (firstMismatchIndex === -1) {
            this.syncParams(rack, assets);
            this.cleanupNodeMap(rack);
            return;
        }

        // 3. Partial Rebuild
        this.partialRebuildGraph(rack, firstMismatchIndex, assets);
    }

    addModule(module: RackModule, assets: Record<string, AudioBuffer>) {
        const newRack = [...this._rack, module];
        this.updateRack(newRack, assets);
    }

    removeModule(moduleId: string, assets: Record<string, AudioBuffer>) {
        const newRack = this._rack.filter(m => m.id !== moduleId);
        this.updateRack(newRack, assets);
    }

    private partialRebuildGraph(rack: RackModule[], startIndex: number, assets: Record<string, AudioBuffer>) {
        // Find the node that preceded the first mismatch
        let previousNode: IAudioNode<IAudioContext | IOfflineAudioContext>;
        if (startIndex === 0) {
            previousNode = this.inputGain as any;
            // We disconnect inputGain from whatever it was connected to
            this.inputGain.disconnect();
        } else {
            const prevId = this.connectedIds[startIndex - 1];
            const prevNode = this.nodeMap.get(prevId);
            if (!prevNode) {
                return this.fullRebuildGraph(rack, assets);
            }
            previousNode = (prevNode instanceof ConvolutionNode)
                ? prevNode.output as unknown as IAudioNode<IAudioContext | IOfflineAudioContext>
                : prevNode as unknown as IAudioNode<IAudioContext | IOfflineAudioContext>;
            previousNode.disconnect();
        }

        // Disconnect all subsequent nodes in the OLD chain
        for (let i = startIndex; i < this.connectedIds.length; i++) {
            const node = this.nodeMap.get(this.connectedIds[i]);
            if (node) node.disconnect();
        }

        // Cleanup nodes no longer in rack
        this.cleanupNodeMap(rack);

        // Reconstruct chain
        const activeIds = this.connectedIds.slice(0, startIndex);

        let foundStart = (startIndex === 0);
        const lastStableId = startIndex > 0 ? this.connectedIds[startIndex - 1] : null;

        rack.forEach(module => {
            if (!foundStart) {
                if (module.id === lastStableId) foundStart = true;
                return;
            }

            const node = this.getOrCreateNode(module, assets);
            NodeFactory.updateParams(node, module, assets);

            if (!module.bypass) {
                this.connectNodes(previousNode, node);
                previousNode = (node instanceof ConvolutionNode)
                    ? node.output as unknown as IAudioNode<IAudioContext | IOfflineAudioContext>
                    : node as unknown as IAudioNode<IAudioContext | IOfflineAudioContext>;
                activeIds.push(module.id);
            }
        });

        // Final connection to output gain (Track Output)
        // Wait, current structure: input -> [rack] -> outputGain -> panner
        // So previousNode connects to outputGain
        previousNode.connect(this.outputGain as any);
        this.connectedIds = activeIds;
    }

    private fullRebuildGraph(rack: RackModule[], assets: Record<string, AudioBuffer>) {
        this.inputGain.disconnect();
        this.nodeMap.forEach(node => node.disconnect());
        this.cleanupNodeMap(rack);

        let previousNode: IAudioNode<IAudioContext | IOfflineAudioContext> = this.inputGain as any;
        const activeIds: string[] = [];

        rack.forEach(module => {
            let node = this.getOrCreateNode(module, assets);
            NodeFactory.updateParams(node, module, assets);

            if (!module.bypass) {
                this.connectNodes(previousNode, node);
                previousNode = (node instanceof ConvolutionNode)
                    ? node.output as unknown as IAudioNode<IAudioContext | IOfflineAudioContext>
                    : node as unknown as IAudioNode<IAudioContext | IOfflineAudioContext>;
                activeIds.push(module.id);
            }
        });

        previousNode.connect(this.outputGain as any);
        this.connectedIds = activeIds;
    }

    private cleanupNodeMap(rack: RackModule[]) {
        const currentIds = new Set(rack.map(m => m.id));
        for (const [id] of this.nodeMap) {
            if (!currentIds.has(id)) {
                this.nodeMap.delete(id);
            }
        }
    }

    private syncParams(rack: RackModule[], assets: Record<string, AudioBuffer>) {
        rack.forEach(module => {
            const node = this.nodeMap.get(module.id);
            if (node) {
                NodeFactory.updateParams(node, module, assets);
            }
        });
    }

    private getOrCreateNode(module: RackModule, assets: Record<string, AudioBuffer>): IAudioNode<IAudioContext | IOfflineAudioContext> | ConvolutionNode {
        let node: IAudioNode<IAudioContext | IOfflineAudioContext> | ConvolutionNode | undefined | null = this.nodeMap.get(module.id);
        if (!node) {
            node = NodeFactory.create(module, this.context, assets);
            if (node) {
                this.nodeMap.set(module.id, node);
            } else {
                return this.context.createGain();
            }
        }
        return node!;
    }

    private connectNodes(source: IAudioNode<IAudioContext | IOfflineAudioContext>, dest: IAudioNode<IAudioContext | IOfflineAudioContext> | ConvolutionNode) {
        if (dest instanceof ConvolutionNode) {
            source.connect(dest.input as unknown as IAudioNode<IAudioContext | IOfflineAudioContext>);
        } else {
            source.connect(dest as unknown as IAudioNode<IAudioContext | IOfflineAudioContext>);
        }
    }

    public updateModuleParam(id: string, param: string, value: any, assets: Record<string, AudioBuffer>) {
        const node = this.nodeMap.get(id);
        const module = { id, parameters: { [param]: value } } as any; // Partial mock
        // We need the full module or just the param update logic?
        // NodeFactory.updateParams can handle it but it iterates over module.parameters.
        // So this partial mock works.
        if (node) {
             NodeFactory.updateParams(node, module, assets);
        }
    }

    public getModuleNode(id: string) {
        return this.nodeMap.get(id);
    }
}
