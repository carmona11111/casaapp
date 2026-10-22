export const houseZones = [
 {id:'z0',name:'Cocina + comedor'},
 {id:'z1',name:'Salón'},
 {id:'z2',name:'Habitaciones'},
 {id:'z3',name:'Baños'}
];

export function houseZoneForLegacy(id,title=''){
 if(id==='z0')return 'z0';
 if(id==='z1'||id==='z9')return 'z1';
 if(['z2','z3','z4'].includes(id))return 'z2';
 if(['z5','z6'].includes(id))return 'z3';
 if(id==='z8')return /baño|toallas/i.test(title)?'z3':'z2';
 if(id==='z7')return /habitaci|cama|sábana/i.test(title)?'z2':/baño|lavabo|wc/i.test(title)?'z3':'z1';
 return id;
}

export function migrateDefaultZones(db){
 const zones=db.prepare('SELECT id,name FROM zones ORDER BY rowid').all();
 if(zones.length!==10||zones.some((zone,index)=>zone.id!==`z${index}`))return;
 const templates=db.prepare('SELECT id,title,zone_id,recurrence FROM templates').all();
 for(const task of templates){
  const recurrence=JSON.parse(task.recurrence);
  if(recurrence.zoneRotation?.length)recurrence.zoneRotation=[...new Set(recurrence.zoneRotation.map(id=>houseZoneForLegacy(id,task.title)))];
  db.prepare('UPDATE templates SET zone_id=?,recurrence=? WHERE id=?').run(houseZoneForLegacy(task.zone_id,task.title),JSON.stringify(recurrence),task.id);
 }
 for(const row of db.prepare("SELECT id,snapshot FROM occurrences WHERE status='open'").all()){
  const snapshot=JSON.parse(row.snapshot);
  snapshot.zone_id=houseZoneForLegacy(snapshot.zone_id,snapshot.title);
  snapshot.zone=houseZones.find(zone=>zone.id===snapshot.zone_id)?.name||snapshot.zone;
  db.prepare('UPDATE occurrences SET snapshot=?,version=version+1 WHERE id=?').run(JSON.stringify(snapshot),row.id);
 }
 for(const zone of houseZones)db.prepare('UPDATE zones SET name=? WHERE id=?').run(zone.name,zone.id);
 db.prepare("DELETE FROM zones WHERE id IN ('z4','z5','z6','z7','z8','z9')").run();
 db.prepare('UPDATE household SET revision=revision+1 WHERE id=?').run('home');
}
