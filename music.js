// Audio is created only after an explicit volume gesture. Nothing is persisted.
export function createMusic({ document, window, control, slider, output, className }) {
  let audio, context, gain, source, sequence = 0, destroyed = false;
  const display = message => {
    output.textContent = message || (Number(slider.value) ? `${slider.value}%` : 'Muted');
    slider.setAttribute('aria-valuetext', output.textContent);
  };
  const mute = message => {
    sequence++;
    slider.value = '0';
    if (gain) gain.gain.value = 0;
    audio?.pause();
    display(message);
  };
  const failed = () => mute('Retry');
  const update = () => {
    if (destroyed || className !== 'ren') return;
    const volume = Math.min(100, Math.max(0, Number(slider.value) || 0));
    slider.value = String(volume);
    if (!volume) { mute(); return; }
    const attempt = ++sequence;
    try {
      if (!audio) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) throw new Error('Web Audio unavailable');
        context = new AudioContext();
        gain = context.createGain();
        gain.gain.value = 0;
        audio = document.createElement('audio');
        audio.src = '/assets/music/ren-login-theme.mp3';
        audio.loop = true;
        audio.preload = 'none';
        audio.addEventListener('error', failed);
        source = context.createMediaElementSource(audio);
        source.connect(gain);
        gain.connect(context.destination);
      }
      // GainNode also controls volume on mobile browsers with fixed media volume.
      gain.gain.value = volume / 100;
      display();
      // Both calls run within the input gesture, before any promise is awaited.
      const resumed = context.resume();
      const played = audio.play();
      Promise.all([resumed, played]).then(() => {
        if (destroyed || className !== 'ren' || Number(slider.value) === 0) audio.pause();
      }).catch(() => { if (attempt === sequence && !destroyed) failed(); });
    } catch { failed(); }
  };
  mute();
  control.hidden = className !== 'ren';
  slider.addEventListener('input', update);
  slider.addEventListener('change', update);
  const pagehide = () => mute();
  window.addEventListener('pagehide', pagehide);
  return {
    setClass(next) {
      if (next === className) return;
      className = next;
      mute();
      if (audio) audio.currentTime = 0;
      control.hidden = next !== 'ren';
    },
    destroy() {
      destroyed = true;
      mute();
      slider.removeEventListener('input', update);
      slider.removeEventListener('change', update);
      window.removeEventListener('pagehide', pagehide);
      audio?.removeEventListener('error', failed);
      source?.disconnect();
      gain?.disconnect();
      context?.close().catch(() => {});
    }
  };
}
