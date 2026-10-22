import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const base=process.env.VISUAL_URL||'http://127.0.0.1:4310';
const output=process.env.VISUAL_OUTPUT||'/tmp/casa-visual-audit';
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
try {
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
  await page.goto(base+'/entrada');
  await page.evaluate(()=>localStorage.setItem('casa-onboarding-v1:ivan','done'));
  await page.reload();
  await page.screenshot({path:`${output}/${width}-acceso.png`});
  console.log(width,'acceso','overflow=',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
  await page.getByRole('button',{name:/Iván/}).first().click();
  await page.waitForTimeout(350);
  async function dismissReminder(){
   const later=page.locator('.reminder-dialog').getByRole('button',{name:'Cerrar recordatorio'});
   if(await later.isVisible())await later.click();
  }
  await dismissReminder();
  if(width<701)await page.locator('.mobile-dock').getByRole('button',{name:'Más'}).click();
  await page.locator('#sidebar').getByRole('button',{name:'Cómo funciona'}).click();
  await page.screenshot({path:`${output}/${width}-guia.png`});
  console.log(width,'guia','overflow=',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
  await page.getByRole('button',{name:'Omitir guía'}).click();
  for(const [name,nav] of [['inicio','Inicio y tareas'],['tareas','Tareas'],['comidas','Comidas y compra'],['economia','Economía y ahorro'],['misiones','Misiones y premios'],['logros','Logros y actividad'],['organizar','Organizar']]){
   if(name!=='inicio'){
    await dismissReminder();
    if(width<701)await page.locator('.mobile-dock').getByRole('button',{name:'Más'}).click();
    await page.locator('#sidebar').getByRole('button',{name:nav}).click();
    await page.waitForTimeout(260);
   }
   await dismissReminder();
   await page.screenshot({path:`${output}/${width}-${name}.png`});
   console.log(width,name,'overflow=',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
   if(name==='tareas'){
    if(width<701){
     const zones=page.locator('.mobile-zone-filters');
     await zones.getByRole('button',{name:'Baños'}).click();
     if(await zones.getByRole('button',{name:'Baños'}).getAttribute('aria-pressed')!=='true')throw new Error('El filtro de zonas no se activó.');
     await page.screenshot({path:`${output}/${width}-mapa-tareas.png`});
     await zones.getByRole('button',{name:'Todas'}).click();
    }else{
     const map=page.locator('.task-room-map');
     await map.scrollIntoViewIfNeeded();
     await page.screenshot({path:`${output}/${width}-mapa-tareas.png`});
     await map.locator('.task-room-map-doors button').first().click();
     if(await map.locator('.task-room-map-doors button').first().getAttribute('aria-pressed')!=='true')throw new Error('El filtro del mapa no se activó.');
     await map.getByRole('button',{name:'Todas las zonas'}).click();
    }
   }
   if(name==='comidas'){
    for(const [index,label] of [[1,'recetario'],[2,'compra']]){
     await page.locator('.meals-nav button').nth(index).click();
     await page.screenshot({path:`${output}/${width}-${label}.png`});
     console.log(width,label,'overflow=',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
    }
    await page.getByRole('button',{name:'Nueva receta'}).first().click();
    await page.screenshot({path:`${output}/${width}-nueva-receta.png`});
    console.log(width,'nueva-receta','overflow=',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
   }
   if(name==='economia'){
    for(const [index,label] of [[1,'ingresos'],[2,'gastos'],[3,'viajes']]){
     await page.locator('.finance-section-tabs button').nth(index).click();
     await page.screenshot({path:`${output}/${width}-${label}.png`});
     console.log(width,label,'overflow=',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
    }
   }
   if(name==='misiones'){
    const picker=page.locator('.coop-essential-picker');
    await picker.scrollIntoViewIfNeeded();
    const catalog=picker.locator('.essential-catalog');
    if((await catalog.getAttribute('open'))===null)await catalog.locator('summary').click();
    const before=await picker.locator('.essential-chip').count();
    await picker.locator('.essential-option button').first().click();
    if(await picker.locator('.essential-chip').count()!==before+1)throw new Error('La tarea acordada no se añadió.');
    await page.screenshot({path:`${output}/${width}-tareas-acordadas.png`});
    await picker.locator('.essential-chip').last().getByRole('button',{name:/Quitar/}).click();
    if(await picker.locator('.essential-chip').count()!==before)throw new Error('La tarea acordada no se quitó.');
    await page.locator('.coop-view-tabs button').nth(1).click();
    await page.screenshot({path:`${output}/${width}-premios.png`});
    console.log(width,'premios','overflow=',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
   }
   if(name==='organizar'){
    await page.getByRole('button',{name:'Añadir tarea'}).first().click();
    await page.screenshot({path:`${output}/${width}-editar-tarea.png`});
    console.log(width,'editar-tarea','overflow=',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
   }
   if(name==='logros'){
    const firstMeme=page.locator('.coop-achievements .meme-sticker').first();
    await firstMeme.scrollIntoViewIfNeeded();
    await firstMeme.evaluate(img=>img.decode());
    if(!(await firstMeme.evaluate(img=>img.naturalWidth>0)))throw new Error('El nuevo sticker no ha cargado.');
    await page.screenshot({path:`${output}/${width}-stickers-memes.png`});
   }
  }
  await page.close();
 }
}finally{await browser.close();}
