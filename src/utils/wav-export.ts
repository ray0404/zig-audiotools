
export interface WavExportOptions {
  bitDepth: 16 | 24 | 32;
  float?: boolean; // Only applicable for 32-bit
}

export function audioBufferToWav(buffer: AudioBuffer, opt?: WavExportOptions): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = opt?.bitDepth || 16;
  const isFloat = bitDepth === 32;
  const format = isFloat ? 3 : 1; // 3 = IEEE Float, 1 = PCM

  let result: Float32Array;
  if (numChannels === 2) {
      result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
      result = buffer.getChannelData(0);
  }

  return encodeWAV(result, numChannels, sampleRate, format, bitDepth);
}

function interleave(inputL: Float32Array, inputR: Float32Array) {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);

  let index = 0;
  let inputIndex = 0;

  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function encodeWAV(samples: Float32Array, numChannels: number, sampleRate: number, format: number, bitDepth: number) {
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * bytesPerSample, true);

  if (bitDepth === 16) {
      floatTo16BitPCM(view, 44, samples);
  } else if (bitDepth === 24) {
      floatTo24BitPCM(view, 44, samples);
  } else if (bitDepth === 32) {
      writeFloat32(view, 44, samples);
  }

  return buffer;
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function floatTo24BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 3) {
    let s = Math.max(-1, Math.min(1, input[i]));
    s = s < 0 ? s * 0x800000 : s * 0x7FFFFF;
    output.setInt8(offset, s & 0xFF);
    output.setInt8(offset + 1, (s >> 8) & 0xFF);
    output.setInt8(offset + 2, (s >> 16) & 0xFF);
  }
}

function writeFloat32(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 4) {
    output.setFloat32(offset, input[i], true);
  }
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

