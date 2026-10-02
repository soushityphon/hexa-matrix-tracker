import { validatePlayerSave } from './player-storage.js';

export const PLAYER_BACKUP_FORMAT='hexa-player-backup';
export const PLAYER_BACKUP_VERSION=1;
export const PLAYER_CLASSES={hoyoung:'Hoyeong',ren:'Len'};
const keyedFields=['levels','statUnlocked','statCompleted','statLines'];
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);

function maps(model) {
  const nodes=[...(model?.nodes||[]),...(model?.stats||[])];
  const byShort=new Map(),bySource=new Map();
  for(const node of nodes) {
    if(typeof node.short!=='string'||typeof node.sourceKey!=='string'||!node.sourceKey)continue;
    if(byShort.has(node.short)||bySource.has(node.sourceKey))throw new Error('Skill source identities are not unique');
    byShort.set(node.short,node.sourceKey);bySource.set(node.sourceKey,node.short);
  }
  return {byShort,bySource};
}
function translateMap(value,map,direction) {
  if(value===undefined)return undefined;
  const result={};
  for(const [key,item] of Object.entries(value)) {
    const translated=map.get(key);
    if(!translated)throw new Error(`Unknown ${direction} skill identity: ${key}`);
    result[translated]=structuredClone(item);
  }
  return result;
}
export function encodePlayerClass(save,model) {
  if(!validatePlayerSave(save))throw new Error('Saved progress is not valid');
  const {byShort}=maps(model),progress=structuredClone(save);
  delete progress.infographicUndo;
  for(const field of keyedFields)if(progress[field]!==undefined)progress[field]=translateMap(progress[field],byShort,'saved');
  return progress;
}
export function decodePlayerClass(progress,model) {
  if(!object(progress))throw new Error('Backup progress is not valid');
  if(Object.hasOwn(progress,'infographicUndo'))throw new Error('Backup contains unsupported undo history');
  const {bySource}=maps(model),save=structuredClone(progress);
  for(const field of keyedFields)if(save[field]!==undefined)save[field]=translateMap(save[field],bySource,'backup');
  if(!validatePlayerSave(save))throw new Error('Backup progress is not valid');
  return save;
}
export function createPlayerBackup(classes,models,exportedAt=new Date().toISOString()) {
  const output={format:PLAYER_BACKUP_FORMAT,version:PLAYER_BACKUP_VERSION,exportedAt,classes:{}};
  for(const className of Object.keys(PLAYER_CLASSES)) {
    if(!Object.hasOwn(classes,className))continue;
    output.classes[PLAYER_CLASSES[className]]={progress:encodePlayerClass(classes[className],models[className])};
  }
  return output;
}
export function parsePlayerBackup(value,models) {
  if(!object(value)||value.format!==PLAYER_BACKUP_FORMAT||value.version!==PLAYER_BACKUP_VERSION||!object(value.classes))throw new Error('Unsupported player backup');
  const allowed=new Set(Object.values(PLAYER_CLASSES));
  if(!Object.keys(value.classes).length||Object.keys(value.classes).some(key=>!allowed.has(key)))throw new Error('Backup class identity is not valid');
  const classes={};
  for(const [className,sourceClass] of Object.entries(PLAYER_CLASSES)) {
    if(!Object.hasOwn(value.classes,sourceClass))continue;
    const entry=value.classes[sourceClass];
    if(!object(entry)||Object.keys(entry).some(key=>key!=='progress'))throw new Error('Backup class record is not valid');
    classes[className]=decodePlayerClass(entry.progress,models[className]);
  }
  return classes;
}
