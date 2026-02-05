import React from 'react';
import { Text } from 'ink';

export const MeterBar = ({ value, label }: { value: number; label: string }) => {
  const width = 20;
  const min = -60;
  const max = 0;
  
  const clamped = Math.max(min, Math.min(max, value));
  const percent = (clamped - min) / (max - min);
  const filled = Math.round(percent * width);
  const empty = width - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  
  let color = 'green';
  if (value > -1) color = 'red';
  else if (value > -6) color = 'yellow';

  return (
    <Text>
      {label}: <Text color={color}>{bar}</Text> {value.toFixed(1)} dB
    </Text>
  );
};
