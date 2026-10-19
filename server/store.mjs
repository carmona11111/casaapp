import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { seed } from './seed.mjs';
import { addDays, matches, mod, responsible, weekOffset } from './dates.mjs';
export function openStore(path) {
 let db;
 try {
  mkdirSync(dirname(path),{recursive:true});
  db=new DatabaseSync(path);
 } catch(cause) {
  throw new Error(`No se puede abrir SQLite en ${path}. Comprueba DATABASE_PATH y los permisos de su carpeta. En Render, comprueba que el disco persistente esté montado en /var/data. No se ha cambiado automáticamente de base de datos.`,{cause});
 }
 db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
 db.exec(readFileSync(new URL('./migrations/001_initial.sql',import.meta.url),'utf8'));
 db.exec(readFileSync(new URL('./migrations/002_pools.sql',import.meta.url),'utf8'));
 db.exec(readFileSync(new URL('./migrations/003_meals.sql',import.meta.url),'utf8'));
 db.exec(readFileSync(new URL('./migrations/004_home_goals.sql',import.meta.url),'utf8'));
 db.exec(readFileSync(new URL('./migrations/005_score_epoch.sql',import.meta.url),'utf8'));
 db.exec(readFileSync(new URL('./migrations/006_goal_preparation.sql',import.meta.url),'utf8'));
 db.exec(readFileSync(new URL('./migrations/007_coop.sql',import.meta.url),'utf8'));
 db.exec(readFileSync(new URL('./migrations/008_shared_tasks.sql',import.meta.url),'utf8'));
 db.exec(readFileSync(new URL('./migrations/009_coop_profile.sql',import.meta.url),'utf8'));
 db.exec(readFileSync(new URL('./migrations/010_coop_modes.sql',import.meta.url),'utf8'));
 db.exec(readFileSync(new URL('./migrations/011_coop_transfers.sql',import.meta.url),'utf8'));
 db.exec(readFileSync(new URL('./migrations/012_coop_agreements.sql',import.meta.url),'utf8'));
 db.exec(readFileSync(new URL('./migrations/013_recipe_ratings.sql',import.meta.url),'utf8'));
 db.exec(readFileSync(new URL('./migrations/014_finance.sql',import.meta.url),'utf8'));
 transaction(db,()=>seed(db)); return db;
}
export function transaction(db,fn){ db.exec('BEGIN IMMEDIATE'); try {const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;} }
export function plan(db){return {house:db.prepare('SELECT * FROM household').get(),people:db.prepare('SELECT * FROM people ORDER BY rowid').all(),zones:db.prepare('SELECT * FROM zones ORDER BY rowid').all(),templates:db.prepare('SELECT * FROM templates ORDER BY rowid').all().map(t=>({...t,steps:JSON.parse(t.steps),recurrence:JSON.parse(t.recurrence)}))};}
export function snapshot(t,date,p){const zoneIds=t.recurrence.zoneRotation||[];const zoneId=zoneIds.length ? zoneIds[mod(Math.floor(weekOffset(date,p.house.base_date)/(t.recurrence.interval||1)),zoneIds.length)] : t.zone_id;return {title:t.title,steps:t.steps,minutes:t.minutes,zone_id:zoneId,zone:p.zones.find(z=>z.id===zoneId)?.name||'',kind:t.recurrence.kind};}
export function generate(db,start,end){const p=plan(db);const insert=db.prepare('INSERT OR IGNORE INTO occurrences (id,template_id,household_id,original_date,scheduled_date,original_person,current_person,snapshot) VALUES (?,?,?,?,?,?,?,?)');transaction(db,()=>{let inserted=0;for(let date=start;date<=end;date=addDays(date,1)) for(const t of p.templates){if(!matches(t,date,p.house.base_date)) continue;const moved=db.prepare("SELECT id FROM occurrences WHERE template_id=? AND status='open' AND original_date<? AND scheduled_date>=? AND scheduled_date<>original_date LIMIT 1").get(t.id,date,date);if(moved) continue;const person=t.person_id||responsible(t.block,date,p.house,p.people);inserted+=Number(insert.run(randomUUID(),t.id,'home',date,date,person,person,JSON.stringify(snapshot(t,date,p))).changes);}if(inserted)db.prepare('UPDATE household SET revision=revision+1').run();});}
export const occurrence = row => row ? {...row,snapshot:JSON.parse(row.snapshot)} : null;
export function event(db,id,action,actor,changes){db.prepare('INSERT INTO events VALUES (?,?,?,?,?,?)').run(randomUUID(),id,action,actor,new Date().toISOString(),JSON.stringify(changes));}
export function fail(status,message){const e=new Error(message);e.status=status;throw e;}
export function act(db,body){
 const row=db.prepare('SELECT * FROM occurrences WHERE id=?').get(body.id);if(!row)fail(404,'La tarea ya no existe. Actualiza la pantalla.');
 if(row.version!==body.version)fail(409,'Esta tarea ha cambiado en otro móvil. Hemos actualizado los datos; revisa e inténtalo de nuevo.');
 const before=occurrence(row);const now=new Date().toISOString();let changes={};
 if(body.action==='undo'){
  if(!['done','skipped'].includes(row.status))fail(409,'Esta tarea no se puede deshacer.');
  changes={status:'open',completed_by:null,completed_at:null};
  const covered=db.prepare("SELECT * FROM occurrences WHERE covered_by=? AND status='covered'").all(row.id);
  for(const c of covered){db.prepare("UPDATE occurrences SET status='open',covered_by=NULL,version=version+1 WHERE id=?").run(c.id);event(db,c.id,'uncover',body.actor,{before:occurrence(c),after:{status:'open'},cause:row.id});}
 }else{
  if(row.status!=='open')fail(409,'Esta ocasión ya no está pendiente.');
  if(body.action==='complete'){
   changes={status:'done',completed_by:body.actor,completed_at:now};
   const older=db.prepare("SELECT * FROM occurrences WHERE template_id=? AND status='open' AND scheduled_date<=? AND original_date<=? AND id<>?").all(row.template_id,row.scheduled_date,row.original_date,row.id);
   const provided=body.covered||[];
   if(older.length!==provided.length||older.some(o=>!provided.some(c=>c.id===o.id&&c.version===o.version))) fail(409,'Las ocasiones pendientes han cambiado. Revisa el grupo antes de completarlo.');
   for(const c of older){db.prepare("UPDATE occurrences SET status='covered',covered_by=?,version=version+1 WHERE id=?").run(row.id,c.id);event(db,c.id,'covered',body.actor,{before:occurrence(c),after:{status:'covered'},cause:row.id});}
  }else if(body.action==='take')changes={current_person:body.actor};
  else if(body.action==='move'){
   changes={scheduled_date:body.date};
   // A moved repetition replaces untouched repetitions inside its postponement interval.
   db.prepare("UPDATE occurrences SET status='open',covered_by=NULL,version=version+1 WHERE status='cancelled' AND covered_by=? AND original_date>?").run(row.id,body.date);
   const duplicates=db.prepare("SELECT * FROM occurrences WHERE template_id=? AND status='open' AND original_date>? AND original_date<=? AND scheduled_date=original_date AND id<>?").all(row.template_id,row.original_date,body.date,row.id);
   for(const other of duplicates){
    if(db.prepare('SELECT 1 FROM events WHERE occurrence_id=? LIMIT 1').get(other.id))continue;
    db.prepare("UPDATE occurrences SET status='cancelled',covered_by=?,version=version+1 WHERE id=?").run(row.id,other.id);
   }
  }
  else if(body.action==='skip')changes={status:'skipped'};
  else if(body.action==='edit')changes={snapshot:JSON.stringify({...before.snapshot,...body.snapshot})};
  else fail(400,'Acción desconocida.');
 }
 const keys=Object.keys(changes);db.prepare(`UPDATE occurrences SET ${keys.map(k=>k+'=?').join(',')}, version=version+1 WHERE id=?`).run(...keys.map(k=>changes[k]),row.id);
 const after=occurrence(db.prepare('SELECT * FROM occurrences WHERE id=?').get(row.id));event(db,row.id,body.action,body.actor,{before,after,reason:body.reason||''});return after;
}
export function refreshFuture(db,from){const p=plan(db);for(const raw of db.prepare("SELECT * FROM occurrences WHERE status='open' AND original_date>=?").all(from)){const t=p.templates.find(t=>t.id===raw.template_id);if(!t)continue;const hasException=db.prepare("SELECT 1 FROM events WHERE occurrence_id=? AND action IN ('take','move','edit','reassign','undo') LIMIT 1").get(raw.id);if(hasException)continue;if(!matches(t,raw.original_date,p.house.base_date)){db.prepare("UPDATE occurrences SET status='cancelled',version=version+1 WHERE id=?").run(raw.id);continue;}const person=t.person_id||responsible(t.block,raw.original_date,p.house,p.people);db.prepare('UPDATE occurrences SET snapshot=?,current_person=?,version=version+1 WHERE id=?').run(JSON.stringify(snapshot(t,raw.original_date,p)),person,raw.id);}
 // Previously cancelled, untouched future repetitions can become active again.
 for(const raw of db.prepare("SELECT * FROM occurrences WHERE status='cancelled' AND covered_by IS NULL AND original_date>=?").all(from)){const t=p.templates.find(t=>t.id===raw.template_id);if(t&&matches(t,raw.original_date,p.house.base_date)){const person=t.person_id||responsible(t.block,raw.original_date,p.house,p.people);db.prepare("UPDATE occurrences SET status='open',snapshot=?,current_person=?,version=version+1 WHERE id=?").run(JSON.stringify(snapshot(t,raw.original_date,p)),person,raw.id);}}
}
