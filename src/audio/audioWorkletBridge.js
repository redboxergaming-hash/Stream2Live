export async function loadCaptureProcessor(audioContext) {
  await audioContext.audioWorklet.addModule('/worklets/capture-processor.js');
}

export async function loadDelayProcessor(audioContext) {
  await audioContext.audioWorklet.addModule('/worklets/delay-processor.js');
}
