import { IAudioContext, IOfflineAudioContext, IAudioNode } from "standardized-audio-context";
import type { RackModule } from "../types.js";
import { logger } from "../../../../src/utils/logger.js";

import { DynamicEQNode } from "../worklets/DynamicEQNode.js";
import { TransientShaperNode } from "../worklets/TransientShaperNode.js";
import { LimiterNode } from "../worklets/LimiterNode.js";
import { MidSideEQNode } from "../worklets/MidSideEQNode.js";
import { MeteringNode } from "../worklets/MeteringNode.js";
import { ConvolutionNode } from "../worklets/ConvolutionNode.js";
import { SaturationNode } from "../worklets/SaturationNode.js";
import { DitheringNode } from "../worklets/DitheringNode.js";
import { ParametricEQNode } from "../worklets/ParametricEQNode.js";
import { DistortionNode } from "../worklets/DistortionNode.js";
import { BitCrusherNode } from "../worklets/BitCrusherNode.js";
import { ChorusNode } from "../worklets/ChorusNode.js";
import { PhaserNode } from "../worklets/PhaserNode.js";
import { TremoloNode } from "../worklets/TremoloNode.js";
import { AutoWahNode } from "../worklets/AutoWahNode.js";
import { FeedbackDelayNode } from "../worklets/FeedbackDelayNode.js";
import { CompressorNode } from "../worklets/CompressorNode.js";
import { DeEsserNode } from "../worklets/DeEsserNode.js";
import { StereoImagerNode } from "../worklets/StereoImagerNode.js";
import { MultibandCompressorNode } from "../worklets/MultibandCompressorNode.js";

export class NodeFactory {
    static create(module: RackModule, context: IAudioContext | IOfflineAudioContext, assets: Record<string, AudioBuffer>): IAudioNode<IAudioContext | IOfflineAudioContext> | ConvolutionNode | null {
        try {
            let node: any = null;
            switch (module.type) {
                case 'DYNAMIC_EQ': node = new DynamicEQNode(context); break;
                case 'TRANSIENT_SHAPER': node = new TransientShaperNode(context); break;
                case 'LIMITER': node = new LimiterNode(context); break;
                case 'MIDSIDE_EQ': node = new MidSideEQNode(context); break;
                case 'CAB_SIM': node = new ConvolutionNode(context); break;
                case 'LOUDNESS_METER': node = new MeteringNode(context); break;
                case 'SATURATION': node = new SaturationNode(context); break;
                case 'DITHERING': node = new DitheringNode(context); break;
                case 'PARAMETRIC_EQ': node = new ParametricEQNode(context); break;
                case 'DISTORTION': node = new DistortionNode(context); break;
                case 'BITCRUSHER': node = new BitCrusherNode(context); break;
                case 'CHORUS': node = new ChorusNode(context); break;
                case 'PHASER': node = new PhaserNode(context); break;
                case 'TREMOLO': node = new TremoloNode(context); break;
                case 'AUTOWAH': node = new AutoWahNode(context); break;
                case 'FEEDBACK_DELAY': node = new FeedbackDelayNode(context); break;
                case 'COMPRESSOR': node = new CompressorNode(context); break;
                case 'DE_ESSER': node = new DeEsserNode(context); break;
                case 'STEREO_IMAGER': node = new StereoImagerNode(context); break;
                case 'MULTIBAND_COMPRESSOR': node = new MultibandCompressorNode(context); break;
                default: return null;
            }

            if (node) {
                this.updateParams(node, module, assets);
            }
            return node;
        } catch (e) {
            logger.error(`Failed to create node for ${module.type}`, e);
            return context.createGain();
        }
    }

    static updateParams(node: IAudioNode<IAudioContext | IOfflineAudioContext> | ConvolutionNode, module: RackModule, assets: Record<string, AudioBuffer>) {
        if (node instanceof ConvolutionNode) {
            if (module.parameters.mix !== undefined) node.setMix(module.parameters.mix);
            if (module.parameters.irAssetId) {
                const buffer = assets[module.parameters.irAssetId];
                if (buffer) node.setBuffer(buffer);
            }
        } else {
            const n = node as any;
            if (typeof n.setParam === 'function') {
                Object.entries(module.parameters).forEach(([key, value]) => {
                    n.setParam(key, value);
                });
            }
        }
    }
}
