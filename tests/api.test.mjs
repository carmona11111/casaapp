import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {Readable,Writable} from 'node:stream';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {localDate,addDays} from '../server/dates.mjs';
const dir=mkdtempSync(join(tmpdir(),'casa-api-'));
process.env.PUBLIC_URL='http://192.168.190.50:4310';process.env.DATABASE_PATH=join(dir,'api.sqlite');process.env.SERVE_BUILD='1';
const {server,closeStore}=await import('../server/index.mjs');
after(()=>{closeStore();rmSync(dir,{recursive:true,force:true});});
// Transport in memory: exercise the actual HTTP handler and SQL, without opening a port.
async function request(path,{method='GET',data,cookie='',key=randomUUID(),origin='http://localhost:4310',ip='test-client'}={}){
 const req=Readable.from(data===undefined?[]:[Buffer.from(JSON.stringify(data))]);req.url=path;req.method=method;req.headers={'content-type':'application/json','x-casa-request':'1','idempotency-key':key,origin,cookie};req.socket={remoteAddress:ip};
 const chunks=[];const headers={};let status=200;const res=new Writable({write(chunk,encoding,cb){chunks.push(Buffer.from(chunk));cb();}});res.setHeader=(k,v)=>{headers[k.toLowerCase()]=v;};res.writeHead=(code,h={})=>{status=code;for(const [k,v]of Object.entries(h))headers[k.toLowerCase()]=v;res.headersSent=true;};res.headersSent=false;
 const done=new Promise((resolve,reject)=>{res.on('finish',resolve);res.on('error',reject);});server.emit('request',req,res);await done;const text=Buffer.concat(chunks).toString();return {status,headers,data:headers['content-type']?.includes('json')?JSON.parse(text):text};
}
test('Acceso directo sin credenciales y bloqueo de escrituras desde otro origen',async()=>{
 const result=await request('/api/state');
 assert.equal(result.status,200);
 assert.equal(result.headers['set-cookie'],undefined);
 assert.equal((await request('/api/history')).status,200);
 assert.equal((await request('/api/export')).status,200);
 assert.equal((await request('/api/action',{method:'POST',origin:'https://untrusted.example',data:{}})).status,403);
});
test('Dos móviles sin cookies comparten completados y resuelven conflictos e idempotencia',async()=>{const {data:state}=await request('/api/state',{});const row=state.occurrences.find(o=>o.status==='open'&&o.scheduled_date===state.today);const older=state.occurrences.filter(o=>o.status==='open'&&o.template_id===row.template_id&&o.id!==row.id&&o.original_date<=row.original_date&&o.scheduled_date<=row.scheduled_date);const payload={id:row.id,version:row.version,actor:'ivan',action:'complete',covered:older.map(o=>({id:o.id,version:o.version}))},key=randomUUID();const first=await request('/api/action',{method:'POST',data:payload,key});assert.equal(first.status,200,JSON.stringify(first.data));const stateB=(await request('/api/state',{})).data;assert.equal(stateB.occurrences.find(o=>o.id===row.id).status,'done');assert.equal((await request('/api/action',{method:'POST',data:payload,key})).status,200);assert.equal((await request('/api/action',{method:'POST',data:payload})).status,409);const events=(await request('/api/history',{})).data;assert.equal(events.filter(e=>e.occurrence_id===row.id&&e.action==='complete').length,1);assert.equal((await request('/api/action',{method:'POST',data:{...payload,action:'skip'},key})).status,409);});
test('Plan: conserva completados, aplica futuras y rechaza un borrador obsoleto',async()=>{const state=(await request('/api/state',{})).data;const before=state.occurrences.find(o=>o.status==='done');const t=state.templates.find(t=>t.id===before.template_id);t.title='Título actualizado de prueba';const payload={plan:state,actor:'ivan',scope:'future'};const saved=await request('/api/plan',{method:'POST',data:payload});assert.equal(saved.status,200,JSON.stringify(saved.data));const next=(await request('/api/state',{})).data;assert.equal(next.occurrences.find(o=>o.id===before.id).snapshot.title,before.snapshot.title);assert.equal((await request('/api/plan',{method:'POST',data:payload})).status,409);});
test('Ausencias: vista previa, consentimiento explícito y asignación persistida',async()=>{const start=addDays(localDate(),1),end=addDays(start,2);const preview=(await request(`/api/absences/preview?person=person2&start=${start}&end=${end}`,{})).data;assert.ok(preview.rows.length>0);const saved=await request('/api/absences',{method:'POST',data:{person_id:'person2',start,end,reassign:true,rows:preview.rows.map(o=>({id:o.id,version:o.version})),actor:'ivan',revision:preview.revision}});assert.equal(saved.status,200,JSON.stringify(saved.data));const next=(await request(`/api/state?start=${start}&end=${end}`,{})).data;for(const row of preview.rows)assert.equal(next.occurrences.find(o=>o.id===row.id).current_person,'ivan');assert.equal(next.absences[0].confirmed,1);});
test('Exportación sin secretos; vista previa, validación y restauración atómica',async()=>{const out=(await request('/api/export',{})).data;assert.equal(out.schemaVersion,1);assert.ok(!JSON.stringify(out).includes('password_fingerprint'));assert.ok(!JSON.stringify(out).includes('token_hash'));const pre=await request('/api/import/preview',{method:'POST',data:out});assert.equal(pre.status,200,JSON.stringify(pre.data));const invalid=structuredClone(out);invalid.occurrences[0].current_person='missing';assert.equal((await request('/api/import/preview',{method:'POST',data:invalid})).status,400);assert.equal((await request('/api/import',{method:'POST',data:{data:out,...pre.data,actor:'ivan',confirm:false}})).status,400);const restored=await request('/api/import',{method:'POST',data:{data:out,...pre.data,actor:'ivan',confirm:true}});assert.equal(restored.status,200,JSON.stringify(restored.data));const after=(await request('/api/export',{})).data;assert.equal(after.occurrences.length,out.occurrences.length);assert.equal(after.events.length,out.events.length+1);});
test('Las rutas de login desaparecen y las cookies antiguas no bloquean el acceso',async()=>{
 assert.equal((await request('/api/login',{method:'POST',data:{}})).status,404);
 assert.equal((await request('/api/logout',{method:'POST',data:{}})).status,404);
 assert.equal((await request('/api/state',{cookie:'casa_session=expired'})).status,200);
});
test('Entrada, manifiesto y recursos estáticos disponibles en el mismo servidor',async()=>{const entry=await request('/entrada');assert.equal(entry.status,200);assert.match(entry.data,/Casa al día/);const manifest=await request('/manifest.webmanifest');assert.equal(manifest.data.start_url,'/');assert.equal(manifest.data.icons.length,2);});

test('El acceso directo acepta el origen LAN y devuelve su enlace de entrada',async()=>{
 const origin='http://192.168.190.50:4310';
 const state=await request('/api/state',{origin});
 assert.equal(state.status,200);
 assert.equal(state.headers['set-cookie'],undefined);
 assert.equal(state.data.entryUrl,origin+'/entrada');
});
