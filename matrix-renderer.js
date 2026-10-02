import { skillAccent } from './skill-colours.js';
import { normaliseDungeon, fragmentCompletionDate } from './fragment-calculator.js';
import { statProgress, validateStatLines } from './hexa-stat.js';
import { escapeHtml, fdExplanation, materialAmount, STAT_FD_NOTE } from './priority-renderer.js';

// Display-only boundary. Save migration, validation, selected Stat state and
// progress actions stay with the tracker. Each render receives its current state.
export function createMatrixRenderer({document, checkMaterialIcons}) {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const rendered=new WeakMap();
  const setText=(element,value)=>{if(element.textContent!==value)element.textContent=value;};
  function replaceMarkup(element,markup) {
    const prior=rendered.get(element);
    if(prior?.markup===markup && prior.children.length===element.childNodes.length && prior.children.every((child,index)=>element.childNodes[index]===child))return;
    element.innerHTML=markup;
    rendered.set(element,{markup,children:[...element.childNodes]});
  }
  function renderInputs({nodes:matrixNodes, statNodes, saved, draft, catalog,
      classLoading, classLoadFailed, initialLevel, clamp, restoreLines, syncPriorityOptions}) {
    $('.stat-list').replaceChildren();
    const selectors=document.createElement('div');selectors.className='stat-selectors';
    $('.stat-list').append(selectors);
    $('#stat-heading').hidden = !statNodes.length;
    for (const node of statNodes) {
      const row=document.createElement('div');row.className='stat-row';
      row.style.setProperty('--skill-accent','var(--ui-accent)');
      const skill=escapeHtml(node.short);
      const lines=restoreLines(node.short);
      const index=statNodes.indexOf(node);
      const selector=document.createElement('div');selector.className='stat-selector';selector.dataset.statSelector=node.short;
      selector.innerHTML=`<button type="button" class="stat-select" data-stat-select="${skill}" aria-controls="stat-panel-${index}" aria-expanded="false" aria-pressed="false"><span class="stat-unlock-icon"><img src="${escapeHtml(node.icon)}" alt=""></span><span class="stat-selector-name visually-hidden">${escapeHtml(node.name)}</span><span class="stat-mini-preview" aria-label="Saved line levels">${[0,1,2].map(line=>`<span class="stat-mini-line ${line===0?'stat-main':'stat-additional'}"><span class="stat-bar" aria-hidden="true">${Array.from({length:10},()=>'<i></i>').join('')}</span><span class="stat-mini-value"></span></span>`).join('')}</span></button><span class="stat-selector-summary"></span><button type="button" class="stat-cancel" data-stat-cancel="${skill}" aria-label="Cancel unlock for ${escapeHtml(node.name)}" title="Cancel unlock" hidden>×</button>`;
      selectors.append(selector);
      row.id=`stat-panel-${index}`;
      row.innerHTML=`<span class="stat-name visually-hidden">${escapeHtml(node.name)}</span><input data-stat-unlocked="${skill}" type="checkbox" hidden tabindex="-1" aria-hidden="true"><h3 class="stat-line-heading">Main Stat</h3><div class="stat-lines">${['Main Stat','2nd additional stat','3rd additional stat'].map((label,index)=>`${index===1?'<h3 class="stat-line-heading">Additional Stats</h3>':''}<label class="stat-line ${index===0?'stat-main':'stat-additional'}"><span class="visually-hidden">${label}</span><span class="stat-bar" aria-hidden="true">${Array.from({length:10},()=>'<i></i>').join('')}</span><input data-stat-line="${skill}" data-line-index="${index}" aria-label="${escapeHtml(node.name)} ${label} level" aria-describedby="stat-note-${statNodes.indexOf(node)}" type="number" min="0" max="10" step="1" value="${lines[index] ?? ''}"></label>`).join('')}</div><div class="stat-summary" hidden><span data-stat="${skill}"></span><span class="stat-fd"></span></div><p class="stat-note" id="stat-note-${statNodes.indexOf(node)}" aria-live="polite"></p>`;
      $('.stat-list').append(row);
    }
    const nodeRow = node => `<label class="node-row" style="--skill-accent:${skillAccent(node.short)}" data-node-row="${node.short}" data-node-id="${node.id}" title="${escapeHtml(node.name)}"><span class="node-icon"><span aria-hidden="true">${node.short[0]}</span><img src="${node.icon}" alt=""></span><span class="node-label">${node.tag ? `<span class="skill-tag">${escapeHtml(node.tag)}</span>` : ''}<span class="node-name">${escapeHtml(node.name)}</span></span><input data-node="${node.short}" aria-label="${escapeHtml(node.name)} level" type="number" min="${initialLevel(node)}" max="30" step="1" value="${clamp(saved.levels?.[node.short], 30, initialLevel(node))}"></label>`;
    const renderGroup = (group, label, descending) => {
      const category = {'Skill Nodes':'Skill','Mastery Nodes':'Mastery','Enhancement Nodes':'Enhancement','Common Nodes':'Common'}[group];
      const nodes = matrixNodes.filter(node => (draft?.skillCategories?.[node.short] || {'Skill Nodes':'Skill','Mastery Nodes':'Mastery','Enhancement Nodes':'Enhancement','Common Nodes':'Common'}[node.group]) === category);
      if (descending) nodes.reverse();
      return `<section class="node-group"><h3 class="group-label">${label}</h3>${nodes.map(nodeRow).join('')}</section>`;
    };
    $('#nodes').innerHTML = matrixNodes.length ? `<div class="node-column">${renderGroup('Skill Nodes', 'Skill', true)}${renderGroup('Enhancement Nodes', 'Enhancement', false)}</div><div class="node-column">${renderGroup('Mastery Nodes', 'Mastery', true)}${renderGroup('Common Nodes', 'Common', false)}</div>` : `<p class="fine">${classLoading?'Loading...':classLoadFailed?'Skills could not be loaded.':'No skills saved. Populate and save Skills in the Admin Panel.'}</p>`;
    $$('.node-icon img').forEach(img => {
      img.addEventListener('error', () => { img.hidden = true; });
      if (img.complete && !img.naturalWidth) img.hidden = true;
    });
    $$('.stat-unlock-icon img').forEach(image => {
      image.addEventListener('error',()=>{image.hidden=true;});
    });
    $$('[data-stat-unlocked]').forEach(input => {
      const skill = input.dataset.statUnlocked;
      const level = clamp(saved.levels?.[skill], 20);
      input.checked = level > 0 || saved.statUnlocked?.[skill] === true;
      input.disabled = level > 0;
    });
    $(`[name="world"][value="${catalog.settings[saved.mode]?.world || 'heroic'}"]`).checked = true;
    syncPriorityOptions();
    $('#owned').value = saved.owned ?? 0;
    $('#perday').value = saved.perday ?? 0;
    $('#erdaRequest').value = saved.erdaRequest === true ? 'yes' : 'none';
    $('#epicDungeon').value = normaliseDungeon(saved.epicDungeon);
    $('#hideDone').checked = saved.hideDone !== false;
    $('#includeJanus').checked = saved.includeJanus === true;
  }

  function syncStatSelection({statNodes, available, selected:selectedStat}) {
    const choices=statNodes.filter(node=>available.has(node.short));
    if(selectedStat!==null&&!choices.some(node=>node.short===selectedStat))selectedStat=null;
    $$('.stat-selector').forEach(selector=>{
      const skill=selector.dataset.statSelector,selected=skill===selectedStat;
      selector.hidden=!available.has(skill);
      selector.classList.toggle('selected',selected);
      selector.querySelector('[data-stat-select]').setAttribute('aria-pressed',String(selected));
      selector.querySelector('[data-stat-select]').setAttribute('aria-expanded',String(selected));
    });
    $$('[data-stat]').forEach(output=>{output.closest('.stat-row').hidden=!available.has(output.dataset.stat)||output.dataset.stat!==selectedStat;});
    return selectedStat;
  }

  function syncStatVisuals({skill, row, statNodes, saved, selected}) {
    const selector=$$('.stat-selector').find(item=>item.dataset.statSelector===skill);
    const unlocked=row.querySelector('[data-stat-unlocked]');
    const icon=selector.querySelector('.stat-unlock-icon');
    setText(selector.querySelector('.stat-selector-name'),row.querySelector('.stat-name').textContent);
    icon.classList.toggle('is-unlocked',unlocked.checked);
    const node=statNodes.find(node=>node.short===skill);
    const iconPath=unlocked.checked ? node.icon : node.icon.replace('-unlocked.png','-locked.png');
    if(icon.querySelector('img').getAttribute('src')!==iconPath)icon.querySelector('img').src=iconPath;
    icon.title=unlocked.checked ? 'Unlocked' : 'Locked';
    selector.querySelector('[data-stat-select]').setAttribute('aria-label',`${row.querySelector('.stat-name').textContent}, ${unlocked.checked?'unlocked':'locked'}. ${selected===skill?'Close':'Edit'} line levels.`);
    const savedLines=saved.statLines?.[skill];
    selector.querySelector('[data-stat-cancel]').hidden=!(unlocked.checked && !unlocked.disabled && validateStatLines(savedLines).complete && savedLines.every(level=>level===0));
    selector.querySelectorAll('.stat-mini-line').forEach((line,index)=>{
      const level=savedLines?.[index];
      const known=Number.isInteger(level)&&level>=0&&level<=10;
      setText(line.querySelector('.stat-mini-value'),known ? String(level) : '');
      line.querySelector('.stat-mini-value').setAttribute('aria-label',`${['Main Stat','2nd additional stat','3rd additional stat'][index]} ${known?level:'not entered'}`);
      line.querySelectorAll('.stat-bar i').forEach((segment,i)=>segment.classList.toggle('filled',known&&i<level));
    });
    selector.querySelector('.stat-selector-summary').classList.toggle('fd-gain',!!row.querySelector('.stat-fd').textContent);
    const summary=selector.querySelector('.stat-selector-summary');
    const fd=row.querySelector('.stat-fd').textContent;
    replaceMarkup(summary,fd ? fdExplanation(fd, STAT_FD_NOTE, `${row.querySelector('.stat-name').textContent} average final damage. ${STAT_FD_NOTE}`,`stat:${skill}`) : escapeHtml(row.querySelector('[data-stat]').textContent));
    summary.setAttribute('aria-label',`${row.querySelector('[data-stat]').getAttribute('aria-label')}. ${fd}`);
    summary.title=fd ? STAT_FD_NOTE : '';
    row.querySelectorAll('[data-stat-line]').forEach(field=>{
      const level=field.value === '' ? null : Number(field.value);
      const valid=Number.isInteger(level)&&level>=0&&level<=10;
      field.closest('.stat-line').querySelectorAll('.stat-bar i').forEach((segment,index)=>segment.classList.toggle('filled',valid&&index<level));
    });
  }

  function highlightCurrentSkill(skill) {
    $$('[data-node-row]').forEach(row => {
      const active = row.dataset.nodeRow === skill;
      row.classList.toggle('next-skill', active);
      if (active) row.setAttribute('aria-current', 'step');
      else row.removeAttribute('aria-current');
    });
    $$('.stat-row').forEach(row => {
      const active = row.querySelector('[data-stat]')?.dataset.stat === skill;
      row.classList.toggle('next-skill', active);
      if (active) row.setAttribute('aria-current', 'step');
      else row.removeAttribute('aria-current');
    });
  }

  function renderProgress({draft, saved, current, nodeByShort, statNodes, selected}) {
    $$('[data-stat]').forEach(input => {
      const row=input.closest('.stat-row');
      const name = row.querySelector('.stat-name');
      if (name) setText(name,draft?.names[input.dataset.stat] || input.dataset.stat);
      const progress=statProgress(saved.statLines?.[input.dataset.stat], current[input.dataset.stat], saved.statCompleted?.[input.dataset.stat] === true);
      setText(input,progress.total < 20 ? `${progress.total} / 20` : '');
      input.setAttribute('aria-label', `${progress.total} of 20 levels`);
      setText(row.querySelector('.stat-fd'),progress.fd === null || row.querySelector('[aria-invalid="true"]') ? '' : `~${progress.fd.toFixed(3)}% FD`);
      if (!row.querySelector('[aria-invalid="true"]')) setText(row.querySelector('.stat-note'),progress.hasLines && (!saved.statCompleted?.[input.dataset.stat] || validateStatLines(saved.statLines?.[input.dataset.stat]).total === 20) ? '' : `Saved total ${progress.total} / 20. Enter all three line levels to update it.`);
      syncStatVisuals({skill:input.dataset.stat, row, statNodes, saved, selected});
    });
    $$('[data-node-row]').forEach(row => {
      setText(row.querySelector('.node-name'),draft?.names[row.dataset.nodeRow] || nodeByShort[row.dataset.nodeRow].name);
      const label = row.querySelector('.node-label');
      let tag = label.querySelector('.skill-tag');
      const tagText = nodeByShort[row.dataset.nodeRow]?.tag || '';
      if (tagText && !tag) { tag = document.createElement('span'); tag.className = 'skill-tag'; label.prepend(tag); }
      if (tag) { setText(tag,tagText); tag.hidden = !tagText; }
    });
  }

  function renderSummary({matrix, heroic, rate, days, duration}) {
    replaceMarkup($('#completion'), `<div class="completion-label"><span>HEXA Matrix Completion</span><strong>${matrix.percent.toFixed(2)}%</strong></div><div class="completion-track" role="progressbar" aria-label="HEXA Matrix completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${matrix.percent.toFixed(2)}"><span style="width:${matrix.percent.toFixed(2)}%"></span></div>`);
    replaceMarkup($('#totals'), `<div class="total"><small>Total Materials Spent</small><strong class="material-total">${materialAmount(matrix.spent.erda, 'erda')} ${materialAmount(matrix.spent.frags, 'frags')}</strong></div><div class="total" id="total-remaining" ${matrix.percent >= 100 ? 'hidden' : ''}><small>Materials to Complete HEXA Matrix</small><strong class="material-total">${materialAmount(matrix.remaining.erda, 'erda')} ${materialAmount(matrix.remaining.frags, 'frags')}</strong></div>`);
    checkMaterialIcons();
    $('#time-estimate').hidden = !heroic || !rate;
    if (heroic && rate) {
      const finish = fragmentCompletionDate(days(matrix.remaining));
      replaceMarkup($('#time-estimate'), `<small>Estimated time for remaining Fragments</small><strong>${finish ? `${finish} · ` : ''}${duration(matrix.remaining)}</strong>`);
    }
  }
  return {renderInputs, syncStatSelection, syncStatVisuals, highlightCurrentSkill, renderProgress, renderSummary};
}
