import { IAudioContext, IGainNode, IConvolverNode, IOfflineAudioContext, IAudioNode, IAudioParam } from "standardized-audio-context";

/**
 * A wrapper around the native ConvolverNode.
 * We use a class to maintain consistency with our other Custom Nodes,
 * allowing us to add "wet/dry" routing or other parameters if needed later.
 * For now, it's a direct wrapper that exposes a 'setBuffer' method.
 */
export class ConvolutionNode {
    public context: IAudioContext | IOfflineAudioContext;
    public input: IGainNode<IAudioContext | IOfflineAudioContext>;
    public output: IGainNode<IAudioContext | IOfflineAudioContext>;
    private convolver: IConvolverNode<IAudioContext | IOfflineAudioContext>;
    private dryNode: IGainNode<IAudioContext | IOfflineAudioContext>;
    private wetNode: IGainNode<IAudioContext | IOfflineAudioContext>;

    constructor(context: IAudioContext | IOfflineAudioContext) {
        this.context = context;
        this.input = context.createGain();
        this.output = context.createGain();
        this.convolver = context.createConvolver();
        
        // Wet/Dry Routing
        this.dryNode = context.createGain();
        this.wetNode = context.createGain();

        // Default: 100% Wet (Standard for Cab Sims)
        this.dryNode.gain.value = 0;
        this.wetNode.gain.value = 1.0;

        // Routing
        // Input -> Dry -> Output
        this.input.connect(this.dryNode);
        this.dryNode.connect(this.output);

        // Input -> Convolver -> Wet -> Output
        this.input.connect(this.convolver);
        this.convolver.connect(this.wetNode);
        this.wetNode.connect(this.output);
    }

    // Determine if this mimics the AudioNode interface enough for our Engine
    connect(destination: IAudioNode<IAudioContext | IOfflineAudioContext> | IAudioParam) {
        this.output.connect(destination as any);
    }

    disconnect() {
        this.output.disconnect();
    }

    setBuffer(buffer: AudioBuffer | null) {
        this.convolver.buffer = buffer;
    }

    setMix(value: number) {
        // value 0 to 1
        // Equal power crossfade? Or linear? 
        // Linear is fine for simple wet/dry
        this.wetNode.gain.value = value;
        this.dryNode.gain.value = 1 - value;
    }
}
