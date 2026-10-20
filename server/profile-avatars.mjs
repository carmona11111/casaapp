import {existsSync,readFileSync} from 'node:fs';

const source=new URL('../public/avatars/catalog.json',import.meta.url);
const built=new URL('../dist/avatars/catalog.json',import.meta.url);
const candidates=process.env.NODE_ENV==='production'?[built,source]:[source,built];
const catalogueFile=candidates.find(existsSync);
if(!catalogueFile)throw new Error('Falta el catálogo de retratos. Ejecuta npm run build.');
const catalogue=JSON.parse(readFileSync(catalogueFile,'utf8'));

// Keep older selections valid; the picker shows the twenty portraits from perfil.zip.
const previous=[
 {key:'mickey',name:'Mickey',film:'Mickey y sus amigos',src:'/mickey.png',legacy:true},
 {key:'cenicienta',name:'Cenicienta',film:'Cenicienta',src:'/cenicienta.png',legacy:true},
 {key:'ratatouille',name:'Ratatouille',film:'Ratatouille',src:'/ratatouille.png',legacy:true},
 {key:'gilito',name:'Tío Gilito',film:'Mickey y sus amigos',src:'/tio-gilito.png',legacy:true}
];

export const profileAvatars=[...catalogue,...previous];
