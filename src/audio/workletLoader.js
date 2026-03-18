export async function loadCaptureWorklet(audioContext) {
  await audioContext.audioWorklet.addModule('/worklets/capture-processor.js');
}
