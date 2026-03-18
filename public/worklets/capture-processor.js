class CaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (!input?.length || !input[0]?.length) {
      return true;
    }

    const channels = input.map((channel) => new Float32Array(channel));
    let peak = 0;
    for (let i = 0; i < channels[0].length; i += 1) {
      peak = Math.max(peak, Math.abs(channels[0][i]));
    }

    this.port.postMessage({ type: 'chunk', channels, peak });
    return true;
  }
}

registerProcessor('capture-processor', CaptureProcessor);
