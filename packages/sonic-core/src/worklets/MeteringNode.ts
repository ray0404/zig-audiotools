import { AudioWorkletNode, IAudioContext, IOfflineAudioContext, TAudioWorkletNodeConstructor } from "standardized-audio-context";

const AudioWorkletNodeBase = AudioWorkletNode as TAudioWorkletNodeConstructor;

/**
 * Node for the MeteringNode effect.
 * Follows the Trinity Pattern.
 */
export class MeteringNode extends AudioWorkletNodeBase<IAudioContext | IOfflineAudioContext> {
    public momentary: number = -100;
    public shortTerm: number = -100;
  
    constructor(context: IAudioContext | IOfflineAudioContext) {
      super(context, 'lufs-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2]
      });
  
      this.port.onmessage = (event) => {
        if (event.data.type === 'meter') {
          this.momentary = event.data.momentary;
          this.shortTerm = event.data.shortTerm;
        }
      };
    }
  }
