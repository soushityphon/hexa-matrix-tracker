// Responsive icon view. Progress and undo rules live in infographic-progress.js.
import { skillAccent } from './skill-colours.js';
import { infographicDone, infographicCanUndo } from './infographic-progress.js';

// Coordinates refer to the grid, so row breaks always return to the left.
export function connectorPaths(rects, width) {
  return rects.slice(1).map((next,index) => {
    const previous = rects[index];
    const x1 = previous.x + previous.width, y1 = previous.y + previous.height / 2;
    const x2 = next.x, y2 = next.y + next.height / 2;
    if (Math.abs(previous.y - next.y) < 1) return `M ${x1} ${y1} H ${x2 - 4}`;
    const gapY = (previous.y + previous.height + next.y) / 2;
    return `M ${x1} ${y1} H ${width - 5} V ${gapY} H 5 V ${y2} H ${x2 - 4}`;
  });
}

export function createInfographic({document,window,grid,onClick}) {
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');
  svg.classList.add('infographic-connectors');svg.setAttribute('aria-hidden','true');
  svg.setAttribute('focusable','false');
  const defs=document.createElementNS(ns,'defs');
  for(const suffix of ['', '-next']) {
    const marker=document.createElementNS(ns,'marker');
    marker.id='infographic-arrow'+suffix;marker.setAttribute('viewBox','0 0 6 6');
    marker.setAttribute('refX','5');marker.setAttribute('refY','3');
    marker.setAttribute('markerWidth','6');marker.setAttribute('markerHeight','6');
    marker.setAttribute('orient','auto');
    if(suffix)marker.classList.add('next');
    const head=document.createElementNS(ns,'path');head.setAttribute('d','M 0 0 L 5 3 L 0 6');
    marker.append(head);defs.append(marker);
  }
  const routes=document.createElementNS(ns,'g');
  svg.append(defs,routes);grid.append(svg);
  const tiles=new Map();let frame=null;
  function draw() {
    frame=null;
    routes.replaceChildren();
    if (grid.closest('[hidden]')) return;
    const bounds=grid.getBoundingClientRect();
    if (!bounds.width) return;
    // Retained buttons can move when the selected priority changes. Map insertion
    // order is not display order, so measure and connect the current DOM sequence.
    const visible=[...grid.querySelectorAll('[data-checkpoint]')].filter(tile=>!tile.hidden);
    const rects=visible.map(tile=>{
      const rect=tile.getBoundingClientRect();
      return {x:rect.left-bounds.left,y:rect.top-bounds.top,width:rect.width,height:rect.height};
    });
    svg.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);
    function addRoute(d,next) {
      const path=document.createElementNS(ns,'path');path.setAttribute('d',d);
      if(next)path.classList.add('next');
      path.setAttribute('marker-end',`url(#infographic-arrow${next?'-next':''})`);routes.append(path);
    }
    if(visible[0]?.getAttribute('aria-current')==='step') {
      const first=rects[0];
      addRoute(`M 5 ${first.y+first.height/2} H ${first.x-4}`,true);
    }
    connectorPaths(rects,bounds.width).forEach((d,index)=>{
      addRoute(d,visible[index+1].getAttribute('aria-current')==='step');
    });
  }
  function schedule() {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame=window.requestAnimationFrame(draw);
  }
  const observer=window.ResizeObserver ? new window.ResizeObserver(schedule) : null;
  observer?.observe(grid);window.addEventListener('resize',schedule);
  grid.addEventListener('click',event=>{
    const button=event.target.closest('[data-checkpoint]');
    if (button && grid.contains(button) && !button.disabled) onClick(button.dataset.checkpoint);
  });
  return {
    render(entries,saved,context,hideCompleted) {
      const active=document.activeElement?.dataset.checkpoint;
      const activeSkill=tiles.get(active)?.dataset.skill;
      const keys=new Set(entries.map(entry=>entry.key));
      const next=entries.find(entry=>!infographicDone(saved,entry))?.key;
      for (const [key,tile] of tiles) if (!keys.has(key)) {tile.remove();tiles.delete(key);}
      for (const [position,entry] of entries.entries()) {
        let tile=tiles.get(entry.key);
        if (!tile) {
          tile=document.createElement('button');tile.type='button';tile.className='checkpoint';
          tile.dataset.checkpoint=entry.key;
          const icon=document.createElement('span');icon.className='checkpoint-icon';icon.setAttribute('aria-hidden','true');
          const fallback=document.createElement('span');fallback.className='checkpoint-fallback';fallback.textContent=entry.name[0] || '?';
          const image=document.createElement('img');image.alt='';
          image.addEventListener('error',()=>{image.hidden=true;fallback.hidden=false;});
          image.addEventListener('load',()=>{fallback.hidden=true;});
          icon.append(fallback,image);
          const label=document.createElement('span');label.className='checkpoint-level';tile.append(icon,label);
          tiles.set(entry.key,tile);
        }
        tile.dataset.skill=entry.skill;
        const done=infographicDone(saved,entry),undo=infographicCanUndo(saved,context,entry);
        const image=tile.querySelector('img');
        if(image.getAttribute('src')!==entry.icon) {
          image.hidden=!entry.icon;tile.querySelector('.checkpoint-fallback').hidden=false;
          if(entry.icon)image.src=entry.icon;else image.removeAttribute('src');
        }
        tile.querySelector('.checkpoint-fallback').textContent=entry.name[0] || '?';
        tile.querySelector('.checkpoint-level').textContent=entry.label;
        tile.style.setProperty('--skill-accent',skillAccent(entry.skill));
        tile.classList.toggle('completed',done);tile.hidden=hideCompleted && done;tile.disabled=done && !undo;
        tile.setAttribute('aria-pressed',String(done));
        if(entry.key===next)tile.setAttribute('aria-current','step');else tile.removeAttribute('aria-current');
        const action=done ? undo ? 'Undo completion' : 'Complete. Edit progress in Tracker' : 'Mark complete';
        tile.setAttribute('aria-label',`${entry.name}, ${entry.label === 'MAX'?'maximum level '+entry.target:'level '+entry.target}. ${action}.`);
        tile.title=tile.getAttribute('aria-label');
        // Keep existing DOM nodes so completion opacity can fade after a click.
        const at=grid.children[position + 1];
        if(at!==tile)grid.insertBefore(tile,at || null);
      }
      if(active && (!tiles.has(active) || tiles.get(active)?.hidden)) {
        const available=[...grid.querySelectorAll('[data-checkpoint]')].filter(tile=>!tile.hidden&&!tile.disabled);
        (available.find(tile=>tile.dataset.skill===activeSkill) || available[0])?.focus();
      }
      schedule();
    },
    clear() {for(const tile of tiles.values())tile.remove();tiles.clear();schedule();},
    redraw:schedule
  };
}
