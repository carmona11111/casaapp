import {resolve} from 'node:path';
import {detectLanAddresses, developmentUrl} from './network.mjs';

export function runtimeConfig(env, root) {
 const production=env.NODE_ENV==='production';
 const port=Number(env.PORT||4310);
 const host=env.HOST||(env.RENDER==='true'?'0.0.0.0':'127.0.0.1');
 const localAddresses=!production&&['0.0.0.0','::'].includes(host)?detectLanAddresses():[];
 const publicUrl=(env.PUBLIC_URL||(env.RENDER==='true'?env.RENDER_EXTERNAL_URL:'')||developmentUrl(host,port,localAddresses)).replace(/\/$/,'');
 const url=new URL(publicUrl);
 if(!['http:','https:'].includes(url.protocol)||url.pathname!=='/'||url.search||url.hash||url.username||url.password)throw new Error('PUBLIC_URL debe ser un origen HTTP(S), sin ruta, parámetros ni credenciales.');
 if(production&&url.protocol!=='https:')throw new Error('Producción requiere PUBLIC_URL con HTTPS o RENDER_EXTERNAL_URL de Render.');
 return {production,port,host,localAddresses,publicUrl,databasePath:env.DATABASE_PATH||resolve(root,'data/casa.sqlite')};
}
