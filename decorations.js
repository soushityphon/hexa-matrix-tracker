import { decorationAssets } from './decoration-assets.js';

const preferenceKey = 'hexa-tracker-animations-v1';
const settings = {
  hoyoung: { desktop: 8, mobile: 5, duration: 120, variation: 35 },
  ren: { desktop: 36, mobile: 18, foreground: 6, duration: 32, variation: 18 }
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

  function particle(asset, foreground = false, cloudSpeed = 'normal') {
    const config = settings[className];
    const wrapper = document.createElement('span');
    wrapper.className = `decoration-particle ${className === 'hoyoung' ? 'cloud' : 'petal'}${foreground ? ' petal-front' : ''}`;
    const duration = foreground ? 70 + Math.random() * 20 : className === 'hoyoung' && cloudSpeed === 'fast' ? 90 + Math.random() * 20 : className === 'hoyoung' && cloudSpeed === 'slow' ? 170 + Math.random() * 25 : config.duration + Math.random() * config.variation;
    wrapper.style.setProperty('--duration', `${duration.toFixed(2)}s`);
    // Cloud height and phase are independent, so they never form an ordered diagonal.
    // Independent phases and speeds keep both scenes from forming ordered lines.
    const phase = Math.random();
    wrapper.style.setProperty('--delay', `${(-duration * phase).toFixed(2)}s`);
    const scale = className === 'hoyoung' ? (narrowScreen?.matches ? .4 : .65) : (foreground ? .6 : .85);
    wrapper.style.setProperty('--size', `${Math.round(asset.width * scale)}px`);
    wrapper.style.setProperty('--alpha', foreground ? '.30' : className === 'hoyoung' ? '.18' : '.40');
    wrapper.style.setProperty('--top', `${6 + Math.random() * 84}%`);
    wrapper.style.setProperty('--start-x', `${25 + Math.random() * 100}vw`);
    wrapper.style.setProperty('--turn', `${20 + Math.random() * 65}deg`);
    if (className === 'ren') {
      const mobile = !!narrowScreen?.matches;
      const randomisePass = () => {
        const start = 35 + Math.random() * 105;
        const travel = 95 + Math.random() * 65;
        const set = (name, value, unit = '') => wrapper.style.setProperty(name, `${value.toFixed(2)}${unit}`);
        set('--start-x', start, 'vw');
        set('--x1', start - travel * (foreground ? .30 : .28) + (Math.random() - .5) * 10, 'vw');
        set('--x2', start - travel * (foreground ? .75 : .62) + (Math.random() - .5) * 14, 'vw');
        set('--end-x', start - travel, 'vw');
        set('--y1', 20 + Math.random() * 10, 'vh');
        set('--y2', (foreground ? 76 : 58) + Math.random() * 14, 'vh');
        const alpha = foreground ? (mobile ? .28 : .36) + Math.random() * (mobile ? .20 : .24) : (mobile ? .36 : .44) + Math.random() * (mobile ? .26 : .28);
        set('--alpha', alpha);
        set('--alpha-low', alpha * (.75 + Math.random() * .15));
        // Blur is fixed for a pass, sparse and slight, never animated.
        set('--blur', Math.random() < .25 ? (foreground ? .3 : .15) + Math.random() * (foreground ? .5 : .2) : 0, 'px');
        set('--sway', 2 + Math.random() * (foreground ? 10 : 5), 'px');
        set('--base-turn', Math.random() * 360, 'deg');
        set('--turn', 15 + Math.random() * 55, 'deg');
      };
      wrapper.style.setProperty('--sway-duration', `${(6 + Math.random() * 9).toFixed(2)}s`);
      wrapper.style.setProperty('--sway-delay', `${(-Math.random() * 15).toFixed(2)}s`);
      randomisePass();
      // Re-roll only at the clipped travel boundary. Keep duration/delay intact
      // so the running CSS timeline never jumps. No timer or frame loop.
      wrapper.addEventListener('animationiteration', event => {
        if (event.target === wrapper && ['petal-drift', 'foreground-drift'].includes(event.animationName)
          && !disposed && enabled && !document.hidden && !reducedMotion?.matches && wrapper.isConnected) randomisePass();
      });
    }
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
    // Shuffle speed groups independently of height and starting phase.
    const speeds = Array(count).fill('normal');
    if (className === 'hoyoung') {
      const fast = mobile ? 2 : 2 + Math.floor(Math.random() * 2);
      const slow = mobile ? 1 : 1 + Math.floor(Math.random() * 2);
      speeds.fill('fast', 0, fast); speeds.fill('slow', fast, fast + slow);
      for (let i = speeds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [speeds[i], speeds[j]] = [speeds[j], speeds[i]];
      }
    }
    const offset = Math.floor(Math.random() * background.length);
    for (let index = 0; index < count; index++) {
      layers[0].append(particle(background[(index + offset) % background.length], false, speeds[index]));
    }
    if (className === 'ren') {
      const large = all.filter(asset => asset.width > 28);
      for (let index = 0; index < config.foreground; index++) {
        const front = particle(large[Math.floor(Math.random() * large.length)], true);
        if (mobile) front.style.setProperty('--size', `${Math.round(parseFloat(front.style.getPropertyValue('--size')) * .7)}px`);
        layers[1].append(front);
      }
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
