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
 async function enter(page,name){await page.goto(url+'/entrada');assert.equal(await page.locator('input[type=password]').count(),0);await page.getByRole('heading',{name:'¿Quién eres?'}).waitFor();await page.getByRole('button',{name:new RegExp(name)}).click();await page.getByRole('heading',{name:new RegExp('Hola, '+name)}).waitFor();}
 await enter(a,'Iván');await enter(b,'Irene');
 await a.getByRole('button',{name:/Completar/}).first().click();await a.getByRole('dialog').or(a.getByText('Guardado en casa',{exact:true})).waitFor();if(await a.getByRole('dialog').isVisible())await a.getByRole('button',{name:'Confirmar',exact:true}).click();await a.getByText('Guardado en casa',{exact:true}).waitFor();
 await b.reload();await b.getByRole('button',{name:'Las dos personas'}).click();await b.getByRole('button',{name:/Deshacer/}).first().waitFor();
 assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Desbordamiento móvil');
 const state=await a.evaluate(async()=>await (await fetch('/api/state')).json());const done=state.occurrences.find(o=>o.status==='done');assert.ok(done);
 await a.reload();await a.getByRole('button',{name:/Deshacer/}).first().waitFor();
 await a.goto(url+'/entrada');await a.getByRole('heading',{name:'¿Quién eres?'}).waitFor();await a.getByRole('button',{name:/Iván/}).click();
 await a.evaluate(()=>navigator.serviceWorker.ready);await a.reload();await a.getByRole('heading',{name:/Hola/}).waitFor();
 await first.setOffline(true);await a.reload();await a.getByText('Estás viendo la última copia guardada.').waitFor();assert.equal(await a.getByRole('button',{name:/Completar/}).first().isDisabled(),true);
 await first.setOffline(false);await a.reload();await a.getByRole('heading',{name:/Hola/}).waitFor();
 await a.getByRole('button',{name:'Abrir menú'}).click();await a.getByRole('button',{name:'Ajustes',exact:true}).click();await a.getByRole('heading',{name:'Así funciona nuestra casa'}).waitFor();assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Ajustes desborda en móvil');
 await a.getByRole('img',{name:/QR de acceso/}).waitFor();assert.equal(await a.getByRole('img',{name:/QR de acceso/}).getAttribute('alt'),'QR de acceso: '+url+'/entrada');
 mkdirSync('test-results',{recursive:true});await a.screenshot({path:'test-results/ajustes-mobile.png',fullPage:true});
 await a.setViewportSize({width:1440,height:1000});await a.getByRole('button',{name:'Hoy',exact:false}).first().click();await a.screenshot({path:'test-results/hoy-desktop.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('Navegador: acceso NFC, dos sesiones, persistencia, offline, QR y diseño móvil verificados.');
}finally{await browser?.close();proc.kill('SIGTERM');await new Promise(resolve=>{if(proc.exitCode!==null)return resolve();proc.once('exit',resolve);});rmSync(dir,{recursive:true,force:true});}
