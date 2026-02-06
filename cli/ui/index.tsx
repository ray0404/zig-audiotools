import React from 'react';
import { render } from 'ink';
import { TerminalApp } from './TerminalApp.js';
import { SonicEngine } from '../../packages/sonic-core/src/index.js';

export const runTUI = async (bridge: SonicEngine) => {
  const { waitUntilExit } = render(<TerminalApp bridge={bridge} />);
  await waitUntilExit();
};
