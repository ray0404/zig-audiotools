import { Command } from 'commander';
import path from 'path';
import { fileURLToPath } from 'url';
import { AudioBridge } from './engine/audio-bridge.js';
import { runTUI } from './ui/index.js';

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
  .action(async (options) => {
    console.log('Starting Sonic Forge TUI...');

    // Simplified path logic
    const isRunningFromDist = __dirname.includes(path.join('dist', 'cli'));
    // If running from dist/cli/index.js, the headless file is in dist/cli/headless.html (or dist/headless.html copied there)
    // If running via tsx from cli/index.ts, the built headless file is in dist/headless.html
    
    let staticDir: string;
    let fileName = 'headless.html';

    if (isRunningFromDist) {
        // We are in dist/cli. We want to serve dist/ which is one level up.
        staticDir = path.resolve(__dirname, '..');
    } else {
        // We are in cli/. We want to serve dist/ which is ../dist
        staticDir = path.resolve(__dirname, '..', 'dist');
    }

    const headlessPath = path.join(staticDir, fileName);

    // Verify existence
    const fs = await import('fs');
    if (!fs.existsSync(headlessPath)) {
        console.error(`Error: Could not find headless engine at "${headlessPath}".`);
        if (!isRunningFromDist) {
            console.error('Hint: You might need to run "npm run build" first.');
        }
        process.exit(1);
    }

    try {
      // 1. Launch the Headless Bridge with static serving
      const bridge = new AudioBridge(staticDir, fileName, options.debug);
      await bridge.init();
      if (options.debug) console.log('Engine Connected.');

      // 2. Launch TUI
      await runTUI(bridge);

      // Cleanup on exit
      await bridge.close();
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