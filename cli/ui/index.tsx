import React from 'react';
import { render } from 'ink';
import { TerminalApp } from './TerminalApp.js';
import { AudioBridge } from '../engine/audio-bridge.js';

export const runTUI = async (bridge: AudioBridge) => {
  const { waitUntilExit } = render(<TerminalApp bridge={bridge} />);
  await waitUntilExit();
};
