import { WorkletProvider } from "@sonic-core/core/types";

// @ts-ignore
import dynamicEqUrl from '@sonic-core/worklets/dynamic-eq-processor.js?worker&url';
// @ts-ignore
import transientUrl from '@sonic-core/worklets/transient-processor.js?worker&url';
// @ts-ignore
import limiterUrl from '@sonic-core/worklets/limiter-processor.js?worker&url';
// @ts-ignore
import midsideUrl from '@sonic-core/worklets/midside-eq-processor.js?worker&url';
// @ts-ignore
import lufsUrl from '@sonic-core/worklets/lufs-processor.js?worker&url';
// @ts-ignore
import saturationUrl from '@sonic-core/worklets/saturation-processor.js?worker&url';
// @ts-ignore
import ditheringUrl from '@sonic-core/worklets/dithering-processor.js?worker&url';
// @ts-ignore
import parametricEqUrl from '@sonic-core/worklets/parametric-eq-processor.js?worker&url';
// @ts-ignore
import distortionUrl from '@sonic-core/worklets/distortion-processor.js?worker&url';
// @ts-ignore
import bitcrusherUrl from '@sonic-core/worklets/bitcrusher-processor.js?worker&url';
// @ts-ignore
import chorusUrl from '@sonic-core/worklets/chorus-processor.js?worker&url';
// @ts-ignore
import phaserUrl from '@sonic-core/worklets/phaser-processor.js?worker&url';
// @ts-ignore
import tremoloUrl from '@sonic-core/worklets/tremolo-processor.js?worker&url';
// @ts-ignore
import autowahUrl from '@sonic-core/worklets/autowah-processor.js?worker&url';
// @ts-ignore
import feedbackDelayUrl from '@sonic-core/worklets/feedback-delay-processor.js?worker&url';
// @ts-ignore
import compressorUrl from '@sonic-core/worklets/compressor-processor.js?worker&url';
// @ts-ignore
import deesserUrl from '@sonic-core/worklets/deesser-processor.js?worker&url';
// @ts-ignore
import stereoImagerUrl from '@sonic-core/worklets/stereo-imager-processor.js?worker&url';
// @ts-ignore
import multibandCompressorUrl from '@sonic-core/worklets/multiband-compressor-processor.js?worker&url';

export class ViteWorkletProvider implements WorkletProvider {
    getModuleUrls(): string[] {
        return [
            dynamicEqUrl,
            transientUrl,
            limiterUrl,
            midsideUrl,
            lufsUrl,
            saturationUrl,
            ditheringUrl,
            parametricEqUrl,
            distortionUrl,
            bitcrusherUrl,
            chorusUrl,
            phaserUrl,
            tremoloUrl,
            autowahUrl,
            feedbackDelayUrl,
            compressorUrl,
            deesserUrl,
            stereoImagerUrl,
            multibandCompressorUrl
        ];
    }
}
