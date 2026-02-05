import { Command } from 'commander';
import path from 'path';
import { fileURLToPath } from 'url';
import { NativeEngine } from './engine/native-engine.js';
import { runTUI } from './ui/index.js';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const program = new Command();

program
  .name('sonicforge')
  .description('Sonic Forge CLI & TUI')
  .version('0.1.0');

program
  .command('start')
  .description('Start the Interactive TUI')
  .option('-d, --debug', 'Enable debug logging')
  .option('--headless', 'Use legacy headless browser engine')
  .action(async (options) => {
    console.log('Starting Sonic Forge TUI...');

    const isRunningFromDist = __dirname.includes(path.join('dist', 'cli'));
    let wasmPath: string;

    if (isRunningFromDist) {
        wasmPath = path.resolve(__dirname, '..', 'wasm', 'dsp.wasm');
    } else {
        wasmPath = path.resolve(__dirname, '..', 'public', 'wasm', 'dsp.wasm');
    }

    if (!fs.existsSync(wasmPath)) {
        console.error(`Error: Could not find DSP WASM at "${wasmPath}".`);
        process.exit(1);
    }

    try {
      if (options.headless) {
          const { AudioBridge } = await import('./engine/audio-bridge.js');
          let staticDir = isRunningFromDist ? path.resolve(__dirname, '..') : path.resolve(__dirname, '..', 'dist');
          const bridge = new AudioBridge(staticDir, 'headless.html', options.debug);
          await bridge.init();
          await runTUI(bridge);
          await bridge.close();
      } else {
          const engine = new NativeEngine(wasmPath);
          await engine.init();
          await runTUI(engine);
          await engine.close();
      }
      process.exit(0);

    } catch (error) {
      console.error('Fatal Error:', error);
      process.exit(1);
    }
  });

const modules = [
  'compressor',
  'tremolo',
  'transient-shaper',
  'stereo-imager',
  'saturation',
  'phaser',
  'parametric-eq',
  'multiband-compressor',
  'midside-eq',
  'metering',
  'limiter',
  'feedback-delay',
  'dynamic-eq',
  'dithering',
  'distortion',
  'deesser',
  'convolution',
  'chorus',
  'bitcrusher',
  'autowah',
];

const modulesCommand = program.command('modules')
  .description('Interact with audio effect modules.');

modulesCommand
  .command('list')
  .description('List all available audio modules.')
  .action(() => {
    console.log('Available SonicForge Modules:');
    modules.forEach(m => console.log(`- ${m}`));
  });

program.parse();