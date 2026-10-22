// Browser check against an isolated SQLite database.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const dir=mkdtempSync(join(tmpdir(),'casa-browser-'));
const port=Number(process.env.TEST_PORT||4311);
const url=`http://localhost:${port}`;
const proc=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,NODE_ENV:'test',SERVE_BUILD:'1',DATABASE_PATH:join(dir,'db.sqlite'),HOST:'127.0.0.1',PORT:String(port),PUBLIC_URL:url},stdio:['ignore','pipe','pipe']});
let startupError='';
proc.stderr.on('data',chunk=>{startupError+=chunk;});
let browser;
try{
 for(let i=0;i<60;i++){
  if(proc.exitCode!==null)throw new Error(startupError||'El servidor no arrancó.');
  try{if((await fetch(url+'/api/health')).ok)break;}catch{}
  if(i===59)throw new Error('Servidor no disponible.');
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const first=await browser.newContext({viewport:{width:390,height:844}});
 const second=await browser.newContext({viewport:{width:390,height:844}});
 const a=await first.newPage(),b=await second.newPage(),errors=[];
 a.on('pageerror',error=>errors.push(error.message));
 b.on('pageerror',error=>errors.push(error.message));
 async function dismiss(page){const close=page.getByRole('button',{name:'Cerrar recordatorio'});if(await close.isVisible())await close.click();}
 async function enter(page,id,name){
  await page.goto(url+'/entrada');
  await page.getByRole('heading',{name:'¿Quién entra al castillo?'}).waitFor();
  await page.evaluate(profile=>localStorage.setItem(`casa-onboarding-v1:${profile}`,'done'),id);
  await page.getByRole('button',{name:new RegExp(name)}).first().click();
  const tour=page.locator('.onboarding-dialog').getByRole('button',{name:'Omitir guía'});
  if(await tour.isVisible())await tour.click();
  await dismiss(page);
  await page.getByRole('heading',{name:new RegExp(`Hola, ${name}`)}).waitFor();
 }
 async function section(page,name){
  await dismiss(page);
  await page.locator('.mobile-dock').getByRole('button',{name:'Más'}).click();
  await page.locator('#sidebar').getByRole('button',{name}).click();
  await dismiss(page);
 }
 await enter(a,'ivan','Iván');
 await enter(b,'irene','Irene');
 await a.locator('.mobile-dock').getByRole('button',{name:'Tareas'}).click();
 assert.equal(await a.locator('.mobile-zone-filters button').count(),5);
 await a.locator('.mobile-zone-filters').getByRole('button',{name:'Baños'}).click();
 assert.equal(await a.locator('.mobile-zone-filters').getByRole('button',{name:'Baños'}).getAttribute('aria-pressed'),'true');
 await a.locator('.mobile-zone-filters').getByRole('button',{name:'Todas'}).click();
 await a.getByRole('button',{name:'La cojo'}).first().click();
 await a.getByRole('button',{name:'Ya la hice'}).first().waitFor();
 await a.getByRole('button',{name:'Ya la hice'}).first().click();
 const pool=await a.evaluate(async()=>await (await fetch('/api/pool')).json());
 assert.equal(pool.completions.length,1);
 assert.equal(pool.completions[0].person_id,'ivan');
 await b.reload();
 await section(b,'Logros y actividad');
 await b.getByText('Aportaciones al hogar').waitFor();
 await a.locator('.mobile-dock').getByRole('button',{name:'Comidas'}).click();
 await a.getByRole('button',{name:'Nueva receta'}).first().click();
 await a.getByLabel('Nombre de la receta').fill('Pasta de casa');
 await a.getByLabel('Ingrediente',{exact:true}).fill('Tomate');
 await a.getByLabel('Cantidad').fill('2');
 await a.getByLabel('Elegir foto de la receta').setInputFiles('public/icon-192.png');
 await a.getByRole('button',{name:'Guardar receta'}).click();
 await a.getByRole('heading',{name:'Pasta de casa'}).waitFor();
 await a.locator('.meals-nav button').first().click();
 await a.locator('.meals-slot select').first().selectOption({label:'Pasta de casa'});
 await a.locator('.reminder-backdrop').waitFor({state:'visible',timeout:3000}).catch(()=>{});
 await dismiss(a);
 await a.locator('.meals-nav button').nth(2).click();
 await a.getByText('Tomate').waitFor();
 await a.getByRole('checkbox').first().click();
 await a.waitForFunction(async()=>{const state=await (await fetch('/api/meals')).json();return state.shopping.find(item=>item.name==='Tomate')?.checked===true;});
 const meals=await a.evaluate(async()=>await (await fetch('/api/meals')).json());
 assert.equal(meals.shopping.find(item=>item.name==='Tomate')?.checked,true);
 await b.reload();
 await b.locator('.reminder-backdrop').waitFor({state:'visible',timeout:3000}).catch(()=>{});
 await dismiss(b);
 await b.locator('.mobile-dock').getByRole('button',{name:'Comidas'}).click();
 await b.locator('.meals-nav button').nth(2).click();
 await b.locator('.shopping-view button').nth(1).click();
 await b.getByText('Tomate').waitFor();
 assert.equal(await b.getByRole('checkbox').first().isChecked(),true);
 assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 mkdirSync('test-results',{recursive:true});
 await a.screenshot({path:'test-results/casa-mobile.png'});
 await a.setViewportSize({width:1440,height:900});
 await a.screenshot({path:'test-results/casa-desktop.png'});
 assert.deepEqual(errors,[]);
 console.log('Navegador: perfiles, tareas, receta con foto, plan, compra y sincronización entre dos móviles verificados.');
}finally{
 await browser?.close();
 proc.kill('SIGTERM');
 await new Promise(resolve=>{if(proc.exitCode!==null)return resolve();proc.once('exit',resolve);});
 rmSync(dir,{recursive:true,force:true});
}
