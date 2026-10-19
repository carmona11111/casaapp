// Real browser check. Requires a host where loopback sockets and Chromium are allowed.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=mkdtempSync(join(tmpdir(),'casa-browser-')),port=Number(process.env.TEST_PORT||4311),url=`http://localhost:${port}`;
const proc=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,NODE_ENV:'test',SERVE_BUILD:'1',DATABASE_PATH:join(dir,'db.sqlite'),HOST:'127.0.0.1',PORT:String(port),PUBLIC_URL:url},stdio:['ignore','pipe','pipe']});
let startupError='';proc.stderr.on('data',chunk=>{startupError+=chunk;});
let browser;
try{
 for(let i=0;i<60;i++){if(proc.exitCode!==null)throw new Error(startupError||'El servidor no arrancó.');try{if((await fetch(url)).ok)break;}catch{}if(i===59)throw new Error('Servidor no disponible.');await new Promise(r=>setTimeout(r,250));}
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const first=await browser.newContext({viewport:{width:390,height:844}}),second=await browser.newContext({viewport:{width:390,height:844}}),a=await first.newPage(),b=await second.newPage();
 const errors=[];a.on('pageerror',e=>errors.push(e.message));b.on('pageerror',e=>errors.push(e.message));
 async function enter(page,name){await page.goto(url+'/entrada');await page.getByRole('heading',{name:'¿Quién eres?'}).waitFor();await page.getByRole('button',{name:new RegExp(name)}).click();await page.getByRole('heading',{name:new RegExp('Hola, '+name)}).waitFor();}
 await enter(a,'Iván');await enter(b,'Irene');
 await a.getByRole('button',{name:'La cojo'}).first().click();await a.getByRole('button',{name:'Ya la hice'}).first().waitFor();
 await b.reload();assert.equal(await b.getByRole('button',{name:'La cojo'}).count()>0,true);
 await a.getByRole('button',{name:'Ya la hice'}).first().click();await a.getByText(/La casa sigue creciendo|Nuevo hito desbloqueado|Logro desbloqueado/).waitFor();
 const state=await a.evaluate(async()=>await (await fetch('/api/pool')).json());assert.equal(state.completions.length,1);assert.equal(state.completions[0].person_id,'ivan');
 await b.reload();await b.getByRole('button',{name:'Abrir menú'}).click();await b.getByRole('button',{name:'Logros y actividad'}).click();await b.getByText('Aportaciones al hogar').waitFor();
 await a.reload();await a.getByRole('heading',{name:/Hola/}).waitFor();
 await a.getByRole('button',{name:'Abrir menú'}).click();await a.getByRole('button',{name:'Comidas y compra'}).click();
 await a.getByRole('heading',{name:'Tu recetario empieza aquí'}).waitFor();
 await a.getByRole('button',{name:'Crear primera receta'}).click();
 await a.getByLabel('Nombre de la receta').fill('Pasta de casa');
 await a.getByLabel('Ingrediente',{exact:true}).fill('Tomate');
 await a.getByLabel('Cantidad').fill('2');
 await a.getByLabel('Elegir foto de la receta').setInputFiles('public/icon-192.png');
 await a.getByRole('button',{name:'Guardar receta'}).click();
 await a.getByRole('heading',{name:'Pasta de casa'}).waitFor();
 await a.getByRole('button',{name:'Plan semanal'}).click();
 await a.getByRole('combobox').first().selectOption({label:'Pasta de casa'});
 await a.getByRole('button',{name:/^Compra/}).click();
 await a.getByText('Tomate').waitFor();
 await a.getByRole('checkbox').check();
 assert.equal((await a.evaluate(async()=>await (await fetch('/api/meals')).json())).shopping[0].checked,true);
 await a.getByRole('button',{name:'Abrir menú'}).click();await a.getByRole('button',{name:'Inicio y tareas'}).click();
 await first.setOffline(true);await a.reload();await a.getByText(/Mostrando la última copia/).waitFor();assert.equal(await a.getByRole('button',{name:'La cojo'}).first().isDisabled(),true);
 await first.setOffline(false);await a.reload();await a.getByRole('heading',{name:/Hola/}).waitFor();
 await a.getByRole('button',{name:'Abrir menú'}).click();await a.getByRole('button',{name:'Organizar'}).click();await a.getByRole('heading',{name:'Organizar las pools'}).waitFor();
 assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Desbordamiento móvil');
 mkdirSync('test-results',{recursive:true});await a.screenshot({path:'test-results/pools-mobile.png',fullPage:true});
 await a.setViewportSize({width:1440,height:1000});await a.getByRole('button',{name:'Inicio y tareas'}).click();await a.screenshot({path:'test-results/pools-desktop.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('Navegador: pools, recetario, foto, plan semanal, compra, persistencia y diseño móvil verificados.');
}finally{await browser?.close();proc.kill('SIGTERM');await new Promise(resolve=>{if(proc.exitCode!==null)return resolve();proc.once('exit',resolve);});rmSync(dir,{recursive:true,force:true});}
