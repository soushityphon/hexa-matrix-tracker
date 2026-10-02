import { createPlayerBackup, parsePlayerBackup, PLAYER_CLASSES } from './player-backup.js';

// Read tracker state at each guard, including after awaits and inside save locks.
// Rendering and progress ownership stay with the tracker; storage rules stay in
// player-storage.js and the backup format stays in player-backup.js.
export function createSaveActions({document, playerStorage, classLoader, classNames,
  getState, sourcePaused, editsPaused, setPending, setSaved, clearSelectedStat,
  clearProgressUndo, renderInputs, render, syncConflict}) {
  const $=selector=>document.querySelector(selector);
  const $$=selector=>[...document.querySelectorAll(selector)];
  let pickingFile=false;
  function downloadJSON(value,name) {
    const blob=new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=name;document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);
  }
  async function backupModels() {
    const entries=await Promise.all(Object.keys(PLAYER_CLASSES).map(async className=>[className,(await classLoader.request(className)).model]));
    return Object.fromEntries(entries);
  }
  async function currentBackup(models) {
    await playerStorage.flush();
    const classes={};
    for(const className of Object.keys(PLAYER_CLASSES)) {
      const key='hexa-tracker-'+className+'-v1';
      if(!playerStorage.canBackup(key))throw new Error('Saved progress for '+classNames[className]+' needs recovery before export');
      classes[className]=playerStorage.read(key);
    }
    return createPlayerBackup(classes,models);
  }
  function backupStatus(message,error=false) {
    const status=$('#backup-status');status.hidden=!message;status.textContent=message;status.classList.toggle('error',error);
  }
  $('#export-progress').addEventListener('click',async()=>{
    const button=$('#export-progress');button.disabled=true;backupStatus('Preparing progress backup...');
    try {
      const backup=await currentBackup(await backupModels());
      downloadJSON(backup,'hexa-matrix-progress-'+new Date().toISOString().slice(0,10)+'.json');
      backupStatus('Progress backup exported for all classes.');
    } catch(error) {backupStatus('Progress could not be exported: '+error.message,true);}
    finally {button.disabled=false;}
  });
  $('#import-progress').addEventListener('click',()=>{
    if(editsPaused())return;
    pickingFile=true;
    try {$('#import-progress-file').click();}catch(error){pickingFile=false;throw error;}
  });
  $('#import-progress-file').addEventListener('cancel',()=>{pickingFile=false;});
  $('#import-progress-file').addEventListener('change',async event=>{
    const file=event.target.files?.[0];event.target.value='';
    if(!file || editsPaused()){pickingFile=false;return;}
    const importSequence=getState().sequence;
    backupStatus('Checking progress backup...');
    try {
      if(file.size>500000)throw new Error('Backup file is too large');
      const models=await backupModels();
      let value;try{value=JSON.parse(await file.text());}catch{throw new Error('Backup is not valid JSON');}
      const classes=parsePlayerBackup(value,models),names=Object.keys(classes).map(name=>classNames[name]).join(', ');
      pickingFile=false;
      if(!confirm(`Restore progress for ${names}? Existing progress for these classes will be replaced. A safety backup of your current progress will download first.`)){backupStatus('Import cancelled.');return;}
      await currentBackup(models);
      if(editsPaused() || importSequence!==getState().sequence)throw new Error('Tracker data changed during import. Retry after loading succeeds');
      const replacements=Object.fromEntries(Object.entries(classes).map(([className,progress])=>['hexa-tracker-'+className+'-v1',progress]));
      setPending(true);
      const replaced=await playerStorage.replaceMany(replacements,()=>{
        if(sourcePaused() || playerStorage.conflict(getState().key) || importSequence!==getState().sequence)return false;
        // The safety download and replacement share the same cross-tab lock.
        const current=Object.fromEntries(Object.keys(PLAYER_CLASSES).map(name=>[name,playerStorage.session('hexa-tracker-'+name+'-v1')]));
        downloadJSON(createPlayerBackup(current,models),'hexa-matrix-before-import-'+new Date().toISOString().slice(0,10)+'.json');
        return true;
      },Object.keys(PLAYER_CLASSES).map(name=>'hexa-tracker-'+name+'-v1'));
      setPending(false);
      if(!replaced)throw new Error('Save changed or storage failed during import. Keep this tab open and retain any safety backup');
      clearProgressUndo();
      setSaved(playerStorage.read(getState().key));
      clearSelectedStat();renderInputs();render();
      backupStatus(`Imported ${names}. Infographic undo history was cleared as agreed.`);
    } catch(error) {setPending(false);backupStatus('Progress import failed: '+error.message,true);}
    finally {pickingFile=false;}
  });
  $('#continue-tab-save').addEventListener('click',async()=>{
    if(sourcePaused() || getState().pending || !playerStorage.conflict(getState().key))return;
    const key=getState().key,className=getState().className,progress=structuredClone(getState().progress);
    setPending(true);
    const continued=await playerStorage.continueSave(key,progress,()=>{
      if(key!==getState().key || sourcePaused())return false;
      return confirm(`Continue this ${classNames[className]} save? This replaces the newer saved progress for this class with the progress in this tab.`);
    });
    setPending(false);
    if(key!==getState().key)return;
    if(!continued){backupStatus('This save was not continued. Replacement was cancelled, or the newer save could not be read or written. Both copies were kept.',true);return;}
    // Keep this tab's fields, including invalid drafts, and its matching Undo.
    // Only valid saved progress is written. The other tab will detect this write.
    render();backupStatus(`Continuing this tab's ${classNames[className]} save.`);
  });
  $('#load-latest-save').addEventListener('click',async()=>{
    if(sourcePaused() || getState().pending)return;
    const key=getState().key,className=getState().className;
    setPending(true);
    const adopted=await playerStorage.adopt(key,latest=>{
      if(key!==getState().key || sourcePaused())return false;
      const drafts=$$('[data-node], [data-stat-line]').some(input=>input.validity.badInput || !input.validity.valid ||
        (input.dataset.statLine && String(input.value)!==String(getState().progress.statLines?.[input.dataset.statLine]?.[Number(input.dataset.lineIndex)] ?? '')));
      return (JSON.stringify(latest)===JSON.stringify(getState().progress) && !drafts) ||
        confirm(`Load the latest saved ${classNames[className]} progress? This replaces this tab's progress and unfinished inputs.`);
    });
    setPending(false);
    if(key!==getState().key)return;
    if(!adopted){backupStatus('Latest save was not loaded. It may be unreadable or damaged, or loading was cancelled. This tab and the saved record were kept.',true);syncConflict();return;}
    setSaved(playerStorage.read(key));clearProgressUndo();clearSelectedStat();
    renderInputs();render();syncConflict();backupStatus(`Loaded latest saved ${classNames[className]} progress.`);
  });

  function bindReset() {
    $('#reset').onclick = async () => {
      if(editsPaused())return;
      if (confirm(`Reset saved ${getState().className==='ren'?'Ren':'Hoyoung'} levels and resources?`)) {
        clearProgressUndo();
        const resetKey=getState().key;
        setPending(true);
        await playerStorage.remove(resetKey);
        setPending(false);
        if(resetKey!==getState().key || playerStorage.conflict(resetKey))return;
        setSaved(playerStorage.session(resetKey));
        renderInputs();
        render();
      }
    };
  }
  // Native file selection can focus the window before or after its change
  // event. Keep the selected file while it is read and validated. Normal
  // focus refreshes resume before confirmation; save checks never pause.
  return {bindReset,pickingFile:()=>pickingFile};
}
