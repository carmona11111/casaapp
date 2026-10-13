import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore,generate,plan,act,transaction} from '../server/store.mjs';
import {addDays} from '../server/dates.mjs';
import {reorganizeHousehold} from '../scripts/rebalance-household.mjs';

function fixture(t){const dir=mkdtempSync(join(tmpdir(),'casa-reparto-'));const db=openStore(join(dir,'db.sqlite'));t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});return db;}

test('Lavavajillas y basura siguen siendo de Iván al rotar; salón siempre de Irene los martes',t=>{
 const db=fixture(t);generate(db,'2026-10-12','2026-11-08');
 for(const row of db.prepare("SELECT * FROM occurrences WHERE template_id IN ('t1','t5')").all())assert.equal(row.current_person,'ivan');
 const salon=db.prepare("SELECT * FROM occurrences WHERE template_id='t16' ORDER BY original_date").all();
 assert.deepEqual(salon.map(o=>o.original_date),['2026-10-13','2026-10-20','2026-10-27','2026-11-03']);
 for(const row of salon){assert.equal(row.current_person,'person2');assert.equal(JSON.parse(row.snapshot).title,'Barrer y fregar el salón');}
});

test('Carga semanal y ciclo completo equilibrados, con limpieza a fondo y suelos para ambos',t=>{
 const db=fixture(t);generate(db,'2026-10-12','2026-11-08');
 const weeks=[];
 for(let i=0;i<4;i++){
  const start=addDays('2026-10-12',i*7),end=addDays(start,6);
  const rows=db.prepare('SELECT * FROM occurrences WHERE scheduled_date BETWEEN ? AND ?').all(start,end);
  const totals={ivan:0,person2:0};const regular={ivan:0,person2:0};
  for(const o of rows){const minutes=JSON.parse(o.snapshot).minutes;totals[o.current_person]+=minutes;if(!['t27','t28','t29','t30'].includes(o.template_id))regular[o.current_person]+=minutes;}
  assert.deepEqual(regular,{ivan:260,person2:270});
  assert.ok(Math.abs(totals.ivan-totals.person2)<=30);
  weeks.push(totals);
 }
 assert.deepEqual(weeks,[{ivan:280,person2:270},{ivan:260,person2:290},{ivan:290,person2:270},{ivan:260,person2:290}]);
 const templates=plan(db).templates;
 for(const id of ['t6','t17','t20'])assert.equal(templates.find(t=>t.id===id).person_id,'ivan');
 for(const id of ['t7','t16','t19'])assert.equal(templates.find(t=>t.id===id).person_id,'person2');
});

test('Reorganizar el plan existente conserva completados y registra solo el salón de hoy una vez',t=>{
 const db=fixture(t);
 // Recreate the old timetable before any changes, including the combined Wednesday floor task.
 db.prepare('UPDATE templates SET person_id=NULL').run();
 for(const id of ['t9','t10','t11'])db.prepare('UPDATE templates SET recurrence=? WHERE id=?').run(JSON.stringify({kind:'weekly',day:1,interval:1,offset:0}),id);
 db.prepare("UPDATE templates SET title='Aspirar y fregar zonas comunes',minutes=25,recurrence=? WHERE id='t16'").run(JSON.stringify({kind:'weekly',day:2,interval:1,offset:0}));
 db.prepare("DELETE FROM templates WHERE id='t34'").run();
 generate(db,'2026-10-12','2026-10-18');
 const original=db.prepare("SELECT * FROM occurrences WHERE template_id='t1' AND original_date='2026-10-12'").get();
 transaction(db,()=>act(db,{id:original.id,version:original.version,action:'complete',actor:'ivan',covered:[]}));
 const before=db.prepare('SELECT * FROM occurrences WHERE id=?').get(original.id);
 const result=reorganizeHousehold(db,'2026-10-13');
 generate(db,'2026-10-13','2026-10-18');
 assert.deepEqual(db.prepare('SELECT * FROM occurrences WHERE id=?').get(original.id),before);
 const done=db.prepare('SELECT * FROM occurrences WHERE id=?').get(result.completed);
 assert.equal(done.status,'done');assert.equal(done.completed_by,'person2');assert.equal(done.scheduled_date,'2026-10-13');
 assert.equal(JSON.parse(done.snapshot).title,'Barrer y fregar el salón');
 assert.equal(db.prepare("SELECT status FROM occurrences WHERE template_id='t16' AND original_date='2026-10-14'").get().status,'cancelled');
 assert.equal(db.prepare("SELECT status FROM occurrences WHERE template_id='t34' AND original_date='2026-10-17'").get().status,'open');
 assert.equal(db.prepare("SELECT current_person FROM occurrences WHERE template_id='t5' AND original_date='2026-10-12'").get().current_person,'ivan');
 assert.equal(db.prepare("SELECT original_person FROM occurrences WHERE template_id='t5' AND original_date='2026-10-12'").get().original_person,'person2');
 assert.equal(reorganizeHousehold(db,'2026-10-13').alreadyApplied,true);
 assert.equal(db.prepare("SELECT COUNT(*) AS count FROM events WHERE occurrence_id=? AND action='complete'").get(result.completed).count,1);
});
