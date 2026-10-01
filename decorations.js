import { decorationAssets } from './decoration-assets.js';

const preferenceKey = 'hexa-tracker-animations-v1';
const settings = {
  hoyoung: { desktop: 5, mobile: 3, duration: 110, variation: 55 },
  ren: { desktop: 12, mobile: 6, duration: 32, variation: 18 }
};

// Decoration owns no tracker state, data requests, timers or frame loop.
export function createDecorations({ document, window, control, className }) {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const narrowScreen = window.matchMedia?.('(max-width: 640px)');
  let enabled = true, renderedClass = null, renderedMobile = null, disposed = false;
  try { enabled = window.localStorage.getItem(preferenceKey) !== 'off'; } catch {}
  const layers = ['background', 'foreground'].map(name => {
    const layer = document.createElement('div');
    layer.className = `decoration-layer decoration-${name}`;
    layer.setAttribute('aria-hidden', 'true');
    layer.hidden = true;
    document.body.append(layer);
    return layer;
  });

  function particle(asset, index, count, foreground = false) {
    const config = settings[className];
    const wrapper = document.createElement('span');
    wrapper.className = `decoration-particle ${className === 'hoyoung' ? 'cloud' : 'petal'}${foreground ? ' petal-front' : ''}`;
    const duration = foreground ? 75 : config.duration + Math.random() * config.variation;
    wrapper.style.setProperty('--duration', `${duration.toFixed(2)}s`);
    // Evenly spread phases, with some variety. Populate the scene at first paint.
    wrapper.style.setProperty('--delay', `${(-duration * (index + Math.random() * .4) / count).toFixed(2)}s`);
    const scale = className === 'hoyoung' ? (narrowScreen?.matches ? .4 : .65) : (foreground ? .6 : .85);
    wrapper.style.setProperty('--size', `${Math.round(asset.width * scale)}px`);
    wrapper.style.setProperty('--alpha', foreground ? '.30' : className === 'hoyoung' ? '.18' : '.40');
    wrapper.style.setProperty('--top', `${8 + (index + .5) / count * 76}%`);
    wrapper.style.setProperty('--start-x', `${25 + Math.random() * 100}vw`);
    wrapper.style.setProperty('--turn', `${20 + Math.random() * 65}deg`);
    const image = document.createElement('img');
    image.alt = '';
    image.draggable = false;
    image.width = asset.width;
    image.height = asset.height;
    // Failed images never show a browser placeholder. No retry loop.
    image.addEventListener('load', () => { wrapper.classList.add('is-loaded'); }, { once: true });
    image.addEventListener('error', () => { wrapper.hidden = true; }, { once: true });
    image.src = `/${asset.path}`;
    wrapper.append(image);
    return wrapper;
  }

  function populate() {
    const mobile = !!narrowScreen?.matches;
    if (renderedClass === className && renderedMobile === mobile) return;
    layers.forEach(layer => layer.replaceChildren());
    renderedClass = className; renderedMobile = mobile;
    const config = settings[className];
    if (!config) return;
    const all = decorationAssets.filter(asset => asset.job === className);
    // Keep tiny sprites near native size. Larger artwork supplies the front detail.
    const background = className === 'ren' ? all.filter(asset => asset.width <= 28) : all;
    const count = mobile ? config.mobile : config.desktop;
    const offset = Math.floor(Math.random() * background.length);
    for (let index = 0; index < count; index++) {
      layers[0].append(particle(background[(index + offset) % background.length], index, count));
    }
    if (className === 'ren') {
      const large = all.filter(asset => asset.width > 28);
      const front = particle(large[Math.floor(Math.random() * large.length)], 0, 1, true);
      front.style.setProperty('--delay', '-20s');
      if (mobile) front.style.setProperty('--size', `${Math.round(parseFloat(front.style.getPropertyValue('--size')) * .7)}px`);
      layers[1].append(front);
    }
  }

  function sync() {
    if (disposed) return;
    const reduced = !!reducedMotion?.matches;
    control.disabled = reduced;
    control.setAttribute('aria-pressed', String(enabled && !reduced));
    control.textContent = reduced ? 'Animations: Off' : `Animations: ${enabled ? 'On' : 'Off'}`;
    control.title = reduced ? 'Disabled by your reduced motion setting' : 'Toggle decorative animations';
    if (enabled && !reduced) populate();
    layers.forEach(layer => {
      layer.hidden = !enabled || reduced || !settings[className];
      layer.classList.toggle('is-paused', !!document.hidden || !enabled || reduced);
    });
  }
  const toggle = () => {
    enabled = !enabled;
    try { window.localStorage.setItem(preferenceKey, enabled ? 'on' : 'off'); } catch {}
    sync();
  };
  const stored = event => {
    if (event.key === preferenceKey || event.key === null) {
      enabled = event.newValue !== 'off';
      sync();
    }
  };
  control.addEventListener('click', toggle);
  document.addEventListener('visibilitychange', sync);
  reducedMotion?.addEventListener('change', sync);
  narrowScreen?.addEventListener('change', sync);
  window.addEventListener('storage', stored);
  sync();
  return {
    setClass(nextClass) { className = nextClass; sync(); },
    destroy() {
      disposed = true;
      control.removeEventListener('click', toggle);
      document.removeEventListener('visibilitychange', sync);
      reducedMotion?.removeEventListener('change', sync);
      narrowScreen?.removeEventListener('change', sync);
      window.removeEventListener('storage', stored);
      layers.forEach(layer => layer.remove());
    }
  };
}
