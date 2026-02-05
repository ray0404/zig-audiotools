import { IAudioContext, IOfflineAudioContext } from "standardized-audio-context";
import { TrackStrip } from "./track-strip";
import { logger } from "@/utils/logger";

export class BusStrip extends TrackStrip {
    constructor(id: string, context?: IAudioContext | IOfflineAudioContext) {
        super(id, context);
    }

    setSource(_buffer: AudioBuffer) {
        logger.warn("Cannot set source on a BusStrip");
    }

    play(_time: number, _offset: number = 0) {
        // No-op for Bus
    }

    stop() {
        // No-op
    }
}
