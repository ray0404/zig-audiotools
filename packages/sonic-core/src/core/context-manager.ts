import { AudioContext, IAudioContext, IOfflineAudioContext } from "standardized-audio-context";
import { logger } from "@/utils/logger";
import { WorkletProvider } from "./types";

export class ContextManager {
  private static _context: IAudioContext | null = null;
  private static initPromise: Promise<void> | null = null;

  static get context(): IAudioContext {
      if (!this._context) {
          throw new Error("ContextManager not initialized. Call init() first.");
      }
      return this._context;
  }

  static async init(provider: WorkletProvider): Promise<void> {
      if (this.initPromise) return this.initPromise;

      this.initPromise = (async () => {
          logger.info("Initializing Audio Context...");
          this._context = new AudioContext();
          await this.loadWorklets(this._context, provider);
          logger.info("Audio Engine Initialized Successfully.");
      })();

      return this.initPromise;
  }

  static async loadWorklets(ctx: IAudioContext | IOfflineAudioContext, provider: WorkletProvider) {
      if (ctx.audioWorklet) {
          try {
            const urls = provider.getModuleUrls();
            await Promise.all(urls.map(url => ctx.audioWorklet!.addModule(url)));
            logger.info("AudioWorklet modules loaded successfully.");
          } catch (err) {
            logger.error(`Failed to load AudioWorklet modules`, err);
            throw err;
          }
      }
  }

  static resume() {
    if (this._context?.state === 'suspended') {
      this._context.resume();
    }
  }
}
