import puppeteer from 'puppeteer-core';
import { EventEmitter } from 'events';
import fs from 'fs';
import express from 'express';
import { Server } from 'http';
import { AddressInfo } from 'net';
import { useTUIStore, TUIState } from '../ui/store.js';

export class AudioBridge extends EventEmitter {
  private browser: any;
  private page: any;
  private server: Server | null = null;
  private staticDir: string;
  private fileName: string;
  private port: number = 0;
  private debug: boolean;

  constructor(staticDir: string, fileName: string, debug: boolean = false) {
    super();
    this.staticDir = staticDir;
    this.fileName = fileName;
    this.debug = debug;
  }

  private log(message: string) {
      if (this.debug) {
          console.log(message);
      }
  }

  private error(message: string, err?: any) {
      if (this.debug) {
          console.error(message, err);
      }
  }

  private async startServer(): Promise<string> {
    return new Promise((resolve, reject) => {
      const app = express();
      app.use(express.static(this.staticDir));
      
      this.server = app.listen(0, '127.0.0.1', () => {
        const address = this.server?.address() as AddressInfo;
        this.port = address.port;
        this.log(`[CLI] Internal server started on port ${this.port}`);
        resolve(`http://127.0.0.1:${this.port}/${this.fileName}`);
      });

      this.server.on('error', (err) => reject(err));
    });
  }

  async init() {
    // 1. Start the local server
    const url = await this.startServer();

    // 2. Launch Puppeteer
    const possiblePaths = [
      process.env.CHROME_BIN,
      '/bin/chromium',
      '/data/data/com.termux/files/usr/bin/chromium',
      '/data/data/com.termux/files/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome'
    ];

    const executablePath = possiblePaths.find(p => p && fs.existsSync(p));

    if (!executablePath) {
      throw new Error(
        'Could not find Chromium executable. Please install it or set CHROME_BIN.'
      );
    }

    this.browser = await puppeteer.launch({
      executablePath,
      headless: true,
      dumpio: this.debug, // Only dump stdout/stderr in debug mode
      ignoreDefaultArgs: ['--mute-audio'],
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu', // Helper for some environments
        '--autoplay-policy=no-user-gesture-required',
        '--use-fake-ui-for-media-stream',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding'
      ]
    });

    this.page = await this.browser.newPage();
    
    this.page.on('console', (msg: any) => {
        if (!this.debug) return;
        const text = msg.text();
        if (text.includes('clamped') || text.includes('AudioParam')) return;
        console.log(`[Browser] ${text}`);
    });

    this.page.on('pageerror', (err: any) => {
        // Always log page errors? Maybe only in debug?
        // Let's stick to debug for clean TUI
        if (this.debug) {
            console.error(`[Browser Page Error] ${err.message}`);
        }
    });

    await this.page.exposeFunction('__TUI_DISPATCH__', (payload: Partial<TUIState>) => {
        useTUIStore.setState(payload);
    });

    this.log(`[CLI] Navigating to: ${url}`);
    await this.page.goto(url, { timeout: 60000 });
    
    try {
        await this.page.waitForFunction('!!window.__SONICFORGE_BRIDGE__', { timeout: 10000 });
        await this.page.evaluate(() => window.__SONICFORGE_BRIDGE__.init(true));
    } catch (e) {
        console.error("Failed to connect to SonicForge Bridge via Headless Browser.");
        throw e;
    }
  }

  async getModuleDescriptors() {
    return this.page.evaluate(() => window.__SONICFORGE_BRIDGE__.getModuleDescriptors());
  }

  async loadAudio(buffer: Buffer) {
    const data = [...buffer];
    return this.page.evaluate(async (buf: number[]) => {
        const arrayBuf = new Uint8Array(buf).buffer;
        return window.__SONICFORGE_BRIDGE__.loadAudio(arrayBuf);
    }, data);
  }

  async updateParam(moduleId: string, paramId: string, value: number) {
    return this.page.evaluate((m: string, p: string, v: number) => {
        return window.__SONICFORGE_BRIDGE__.updateParam(m, p, v);
    }, moduleId, paramId, value);
  }

  async addModule(type: string) {
    return this.page.evaluate((t: string) => window.__SONICFORGE_BRIDGE__.addModule(t), type);
  }

  async removeModule(id: string) {
    return this.page.evaluate((i: string) => window.__SONICFORGE_BRIDGE__.removeModule(i), id);
  }

  async reorderRack(start: number, end: number) {
    return this.page.evaluate((s: number, e: number) => window.__SONICFORGE_BRIDGE__.reorderRack(s, e), start, end);
  }

  async toggleModuleBypass(id: string) {
    return this.page.evaluate((i: string) => window.__SONICFORGE_BRIDGE__.toggleModuleBypass(i), id);
  }

  async togglePlay() {
    return this.page.evaluate(() => window.__SONICFORGE_BRIDGE__.togglePlay());
  }

  async setMasterVolume(val: number) {
    return this.page.evaluate((v: number) => window.__SONICFORGE_BRIDGE__.setMasterVolume(v), val);
  }

  async seek(time: number) {
    return this.page.evaluate((t: number) => window.__SONICFORGE_BRIDGE__.seek(t), time);
  }

  async getRack() {
    return this.page.evaluate(() => window.__SONICFORGE_BRIDGE__.getRack());
  }

  async getPlaybackState() {
    return this.page.evaluate(() => window.__SONICFORGE_BRIDGE__.getPlaybackState());
  }

  async getMetering() {
    return this.page.evaluate(() => {
        return window.__SONICFORGE_BRIDGE__.getMeteringData();
    });
  }

  async exportAudio(outputPath: string) {
    this.log(`[CLI] Exporting audio to ${outputPath}...`);
    const result = await this.page.evaluate(async () => {
        return await window.__SONICFORGE_BRIDGE__.exportAudio();
    });

    if (!result.success || !result.data) {
        throw new Error(result.error || 'Export failed with no data');
    }

    const buffer = Buffer.from(result.data);
    fs.writeFileSync(outputPath, buffer);
    this.log(`[CLI] Export saved to ${outputPath}`);
    return true;
  }

  async close() {
    if (this.browser) await this.browser.close();
    if (this.server) {
        this.server.close();
        this.log('[CLI] Server stopped.');
    }
  }
}

declare global {
  interface Window {
    __SONICFORGE_BRIDGE__: any;
    __TUI_DISPATCH__: (payload: Partial<TUIState>) => void;
  }
}
