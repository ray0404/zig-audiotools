class DitheringProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      return [
        { name: 'bitDepth', defaultValue: 24, minValue: 8, maxValue: 32 }
      ];
    }
  
    process(inputs, outputs, parameters) {
      const input = inputs[0];
      const output = outputs[0];
      const bitDepthParam = parameters.bitDepth;
  
      if (!input || !input[0] || !output) return true;
  
      const channelCount = input.length;
  
      for (let channel = 0; channel < channelCount; channel++) {
        const inputChannel = input[channel];
        const outputChannel = output[channel];
        const length = inputChannel.length;
  
        // Optimization: check if bitDepth is constant
        const isDepthConst = bitDepthParam.length === 1;
        let currentDepth = bitDepthParam[0];
        
        // Cache scale if constant
        let scale = Math.pow(2, currentDepth - 1);
        
        for (let i = 0; i < length; i++) {
          if (!isDepthConst) {
              currentDepth = bitDepthParam[i];
              scale = Math.pow(2, currentDepth - 1);
          }
  
          // If depth is >= 32, we treat it as bypass (float 32 processing)
          if (currentDepth >= 32) {
              outputChannel[i] = inputChannel[i];
              continue;
          }
  
          const sample = inputChannel[i];
  
          // 1. Scale up
          let val = sample * scale;
  
          // 2. Add TPDF noise (Triangular Probability Density Function)
          // Sum of two uniform random variables (-0.5 to 0.5) * 2 effectively?
          // dithering.ts used: Math.random() - Math.random()
          // This generates a value between -1 and 1, with triangular distribution centered at 0.
          // This represents +/- 1 LSB of dither.
          const noise = Math.random() - Math.random();
          val += noise;
  
          // 3. Round to nearest integer
          val = Math.round(val);
  
          // 4. Scale down
          val = val / scale;
  
          // 5. Hard clip
          if (val > 1.0) val = 1.0;
          else if (val < -1.0) val = -1.0;
  
          outputChannel[i] = val;
        }
      }
  
      return true;
    }
  }
  
  registerProcessor('dithering-processor', DitheringProcessor);
