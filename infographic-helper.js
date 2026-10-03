import { catalogueLocations, renderMatrixLocation } from './helper-matrix.js';
import { renderHelperExplanation } from './helper-content.js';
import { skillAccent } from './skill-colours.js';

export const HELPER_PREFERENCE='hexa-tracker-helper-v1';
export const helperSupported=nodes=>nodes.some(node=>typeof node.helperExplanation==='string' && node.helperExplanation.trim());

export function createInfographicHelper({document,grid,control,panel,readPreference,writePreference}) {
  const window=document.defaultView;
  let preference;try{const stored=readPreference(HELPER_PREFERENCE);if(stored==='true' || stored==='false')preference=stored==='true';}catch{}
  let state=null,hovered=null,anchor=null,context=null,openTimer=null,closeTimer=null;
  const location=document.createElement('div');location.className='helper-location';
  const heading=document.createElement('div');heading.className='helper-heading';
  const image=document.createElement('img');image.alt='';image.addEventListener('error',()=>{image.hidden=true;});
  const name=document.createElement('strong');heading.append(image,name);
  const explanation=document.createElement('div');explanation.className='helper-explanation';
  panel.append(location,heading,explanation);
  function cancelTimers(){window.clearTimeout(openTimer);window.clearTimeout(closeTimer);openTimer=closeTimer=null;}
  function highlight(){for(const tile of grid.querySelectorAll('[data-checkpoint]'))tile.classList.toggle('skill-hover',tile.dataset.skill===hovered);}
  function hide(){panel.hidden=true;anchor?.removeAttribute('aria-describedby');}
  function stop(){cancelTimers();hide();anchor=null;hovered=null;highlight();}
  function position(){
    if(panel.hidden || !anchor)return;
    const box=anchor.getBoundingClientRect(),width=document.documentElement.clientWidth || window.innerWidth,height=window.innerHeight;
    if(box.bottom<0 || box.top>height || box.right<0 || box.left>width){stop();return;}
    panel.style.maxHeight='calc(100dvh - 16px)';
    let popup=panel.getBoundingClientRect();const margin=8,gap=8;
    let left,top;
    if(box.right+gap+popup.width<=width-margin){left=box.right+gap;top=box.top;}
    else if(box.left-gap-popup.width>=margin){left=box.left-gap-popup.width;top=box.top;}
    else{
      const above=box.top-gap-margin,below=height-box.bottom-gap-margin,useAbove=above>=below;
      // Bound narrow-screen height to the available side, keeping the source clickable.
      panel.style.maxHeight=Math.max(0,useAbove?above:below)+'px';popup=panel.getBoundingClientRect();
      left=(box.left+box.right-popup.width)/2;
      top=useAbove ? box.top-popup.height-gap : box.bottom+gap;
    }
    panel.style.left=Math.max(margin,Math.min(left,width-popup.width-margin))+'px';
    panel.style.top=Math.max(margin,Math.min(top,height-popup.height-margin))+'px';
  }
  function draw(){
    if(!state)return;
    const all=[...state.nodes,...state.stats],supported=helperSupported(all);
    control.disabled=!supported;control.checked=supported && (preference ?? true);
    control.title=supported?'Show a Helper guide when hovering a priority icon':'Helper is not supported for this class yet';
    document.querySelector('#helper-support').textContent=supported?'':'Not supported for this class';
    highlight();
    const target=all.find(node=>node.short===hovered);
    if(!state.visible || !control.checked || !target || !anchor?.isConnected){hide();return;}
    panel.dataset.skill=target.short;
    name.textContent=[target.tag,target.name || target.short].filter(Boolean).join(' · ');
    image.hidden=!target.icon;if(target.icon && image.getAttribute('src')!==target.icon){image.hidden=false;image.src=target.icon;}
    renderHelperExplanation(explanation,target.helperExplanation || '');
    panel.style.setProperty('--helper-accent',skillAccent(target.short));
    if(state.stats.some(node=>node.short===target.short)){
      const stat=document.createElement('img');stat.className='helper-stat-icon';stat.src=target.icon;stat.alt=target.name || target.short;
      stat.addEventListener('error',()=>{stat.hidden=true;});location.replaceChildren(stat);
    }else{
      try{renderMatrixLocation(location,catalogueLocations(state.nodes,state.available),target);}
      catch{location.textContent='Matrix location unavailable. The saved category and core order need review.';}
    }
    panel.hidden=false;anchor.setAttribute('aria-describedby',panel.id);position();
  }
  function preview(tile){
    window.clearTimeout(closeTimer);closeTimer=null;
    if(anchor===tile && hovered===tile.dataset.skill)return;
    cancelTimers();hide();anchor=tile;hovered=tile.dataset.skill;highlight();
    // Brief dwell avoids flashing a guide while crossing many priority icons.
    openTimer=window.setTimeout(()=>{openTimer=null;draw();},150);
  }
  function leave(){window.clearTimeout(openTimer);openTimer=null;window.clearTimeout(closeTimer);closeTimer=window.setTimeout(stop,180);}
  function tileAt(node){const tile=node?.closest?.('[data-checkpoint]');return tile && grid.contains(tile)?tile:null;}
  grid.addEventListener('pointerover',event=>{if(event.pointerType==='touch')return;const tile=tileAt(event.target);if(tile)preview(tile);});
  grid.addEventListener('pointerout',event=>{
    if(event.pointerType==='touch')return;
    if(panel.contains(event.relatedTarget)){window.clearTimeout(closeTimer);return;}
    const next=tileAt(event.relatedTarget);if(next)preview(next);else leave();
  });
  grid.addEventListener('pointerleave',event=>{if(!panel.contains(event.relatedTarget))leave();});
  panel.addEventListener('pointerenter',()=>{window.clearTimeout(closeTimer);closeTimer=null;});
  panel.addEventListener('pointerleave',event=>{const next=tileAt(event.relatedTarget);if(next)preview(next);else leave();});
  // Never pin a guide or replace the existing completion/reverse Undo handler.
  grid.addEventListener('click',stop);
  document.addEventListener('keydown',event=>{if(event.key==='Escape')stop();});
  window.addEventListener('blur',stop);
  window.addEventListener('resize',position);
  window.addEventListener('scroll',position,true);
  control.addEventListener('change',()=>{if(control.disabled)return;preference=control.checked;try{writePreference(HELPER_PREFERENCE,String(preference));}catch{}stop();draw();});
  return {update(value){
    if(context!==value.context || !value.visible || (anchor && (!anchor.isConnected || anchor.hidden)))stop();
    state=value;context=value.context;
    // State refresh never opens a guide without a pointer dwell.
    if(!panel.hidden)draw();else{
      const supported=helperSupported([...state.nodes,...state.stats]);control.disabled=!supported;control.checked=supported && (preference ?? true);
      control.title=supported?'Show a Helper guide when hovering a priority icon':'Helper is not supported for this class yet';
      document.querySelector('#helper-support').textContent=supported?'':'Not supported for this class';highlight();
    }
  },clear(){stop();state=null;context=null;control.disabled=true;control.checked=false;control.title='Helper unavailable for this selection';document.querySelector('#helper-support').textContent='Unavailable for this selection';}};
}
