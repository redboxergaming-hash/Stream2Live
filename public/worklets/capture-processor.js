class CaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (!input || !input.length || !input[0]?.length) {
      return true;
    }

    const channels = input.map((channel) => new Float32Array(channel));
    this.port.postMessage({ channels });
    return true;
  }
}

registerProcessor('capture-processor', CaptureProcessor);
