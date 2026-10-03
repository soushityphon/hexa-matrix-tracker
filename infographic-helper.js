import { catalogueLocations, renderMatrixLocation } from './helper-matrix.js';
import { renderHelperExplanation } from './helper-content.js';
import { infographicDone } from './infographic-progress.js';
import { skillAccent } from './skill-colours.js';

export const HELPER_PREFERENCE='hexa-tracker-helper-v1';
export const helperSupported=nodes=>nodes.some(node=>typeof node.helperExplanation==='string' && node.helperExplanation.trim());

export function createInfographicHelper({document,grid,control,panel,summary,readPreference,writePreference}) {
  let preference;try{const stored=readPreference(HELPER_PREFERENCE);if(stored==='true' || stored==='false')preference=stored==='true';}catch{}
  let state=null,hovered=null,context=null;
  const heading=document.createElement('div');heading.className='helper-heading';
  const image=document.createElement('img');image.alt='';image.addEventListener('error',()=>{image.hidden=true;});
  const name=document.createElement('strong');heading.append(image,name);
  const location=document.createElement('div');location.className='helper-location';
  const details=document.createElement('div');details.className='helper-details';
  const explanation=document.createElement('div');explanation.className='helper-explanation';details.append(heading,explanation);
  panel.append(location,details);
  function highlight() {
    for(const tile of grid.querySelectorAll('[data-checkpoint]'))tile.classList.toggle('skill-hover',tile.dataset.skill===hovered);
  }
  function draw() {
    if(!state)return;
    const all=[...state.nodes,...state.stats],supported=helperSupported(all);
    control.disabled=!supported;control.checked=supported && (preference ?? true);
    control.title=supported?'Show HEXA Matrix locations and explanations':'Helper is not supported for this class yet';
    document.querySelector('#helper-support').textContent=supported?'':'Not supported for this class';
    const open=state.visible && control.checked;
    panel.hidden=!open;summary.classList.toggle('helper-open',open);
    highlight();if(!open)return;
    const next=state.entries.find(entry=>!infographicDone(state.saved,entry));
    const target=all.find(node=>node.short===(hovered || next?.skill));
    panel.dataset.skill=target?.short || '';
    name.textContent=target ? [target.tag,target.name || target.short].filter(Boolean).join(' · ') : 'All priority steps complete';
    image.hidden=!target?.icon;if(target?.icon && image.getAttribute('src')!==target.icon){image.hidden=false;image.src=target.icon;}
    if(!target)image.removeAttribute('src');
    renderHelperExplanation(explanation,target?.helperExplanation || '');
    panel.style.setProperty('--helper-accent',skillAccent(target?.short));
    if(target && state.stats.some(node=>node.short===target.short)) {
      const stat=document.createElement('img');stat.className='helper-stat-icon';stat.src=target.icon;stat.alt=target.name || target.short;
      stat.addEventListener('error',()=>{stat.hidden=true;});location.replaceChildren(stat);
    }else {
      try{renderMatrixLocation(location,catalogueLocations(state.nodes,state.available),target);}
      catch{location.textContent='Matrix location unavailable. The saved category and core order need review.';}
    }
  }
  function preview(skill){if(hovered===skill)return;hovered=skill;draw();}
  grid.addEventListener('pointerover',event=>{const tile=event.target.closest?.('[data-checkpoint]');if(tile && grid.contains(tile))preview(tile.dataset.skill);});
  grid.addEventListener('pointerout',event=>{const next=event.relatedTarget?.closest?.('[data-checkpoint]');if(!next || !grid.contains(next))preview(null);else preview(next.dataset.skill);});
  grid.addEventListener('pointerleave',()=>preview(null));
  // Existing completion handler runs first. Restore the new next step after it.
  grid.addEventListener('click',()=>preview(null));
  control.addEventListener('change',()=>{if(control.disabled)return;preference=control.checked;try{writePreference(HELPER_PREFERENCE,String(preference));}catch{}draw();});
  return {update(value){if(context!==value.context || !value.visible){hovered=null;context=value.context;}
    state=value;if(hovered && ![...grid.querySelectorAll('[data-checkpoint]')].some(tile=>!tile.hidden && tile.dataset.skill===hovered))hovered=null;draw();},
    clear(){state=null;hovered=null;context=null;panel.hidden=true;summary.classList.remove('helper-open');control.disabled=true;control.checked=false;
      control.title='Helper unavailable for this selection';document.querySelector('#helper-support').textContent='Unavailable for this selection';highlight();}};
}
