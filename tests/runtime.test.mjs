import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,existsSync,mkdirSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {runtimeConfig} from '../server/runtime.mjs';
import {openStore} from '../server/store.mjs';

const render={NODE_ENV:'production',RENDER:'true',RENDER_EXTERNAL_URL:'https://casa-test.onrender.com',PORT:'10000'};
test('Render detecta URL y escucha pública; conserva la ruta de disco configurada',()=>{
 const config=runtimeConfig({...render,DATABASE_PATH:'/var/data/casa.sqlite'},'/app');
 assert.equal(config.publicUrl,render.RENDER_EXTERNAL_URL);
 assert.equal(config.host,'0.0.0.0');
 assert.equal(config.port,10000);
 assert.equal(config.databasePath,'/var/data/casa.sqlite');
 assert.deepEqual(config.localAddresses,[]);
 assert.equal(runtimeConfig({...render,PUBLIC_URL:'https://casa.example/',DATABASE_PATH:'/var/data/casa.sqlite'},'/app').publicUrl,'https://casa.example');
 for(const DATABASE_PATH of [undefined,'./data/casa.sqlite','/app/data/casa.sqlite','/var/data/../app/casa.sqlite'])
  assert.throws(()=>runtimeConfig({...render,DATABASE_PATH},'/app'),/disco persistente/);
});
test('Producción mantiene la validación HTTPS y de origen',()=>{
 for(const PUBLIC_URL of ['http://casa.example','https://casa.example/ruta','https://user:secret@casa.example']) {
  assert.throws(()=>runtimeConfig({...render,PUBLIC_URL},'/app'));
 }
 assert.throws(()=>runtimeConfig({NODE_ENV:'production'},'/app'),/HTTPS/);
});
test('Un error de ruta no crea otra base de datos',()=>{
 const dir=mkdtempSync(join(tmpdir(),'casa-storage-'));
 try {
  const config=runtimeConfig({NODE_ENV:'development',DATABASE_PATH:join(dir,'casa.sqlite')},dir);
  const db=openStore(config.databasePath);
  assert.equal(db.prepare('PRAGMA quick_check').get().quick_check,'ok');
  db.close();
  const occupied=join(dir,'not-a-directory');writeFileSync(occupied,'file');
  assert.throws(()=>openStore(join(occupied,'casa.sqlite')),error=>{
   assert.match(error.message,/disco persistente/);
   assert.match(error.message,/No se ha cambiado automáticamente/);
   assert.ok(error.cause);
   return true;
  });
  assert.equal(existsSync(join(occupied,'casa.sqlite')),false);
 } finally {rmSync(dir,{recursive:true,force:true});}
});

test('La imagen de producción carga los retratos desde dist sin public',async()=>{
 const root=mkdtempSync(join(tmpdir(),'casa-runtime-'));
 try{
  mkdirSync(join(root,'server'));
  mkdirSync(join(root,'dist','avatars'),{recursive:true});
  copyFileSync(new URL('../server/profile-avatars.mjs',import.meta.url),join(root,'server','profile-avatars.mjs'));
  copyFileSync(new URL('../public/avatars/catalog.json',import.meta.url),join(root,'dist','avatars','catalog.json'));
  assert.equal(existsSync(join(root,'public')),false);
  const {profileAvatars}=await import(pathToFileURL(join(root,'server','profile-avatars.mjs')).href);
  assert.equal(profileAvatars.filter(avatar=>!avatar.legacy).length,20);
 }finally{rmSync(root,{recursive:true,force:true});}
});
