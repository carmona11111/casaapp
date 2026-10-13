import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lanAddresses,developmentUrl} from '../server/network.mjs';
import {requestId} from '../src/id.ts';

test('La entrada LAN usa la red física y descarta loopback, Docker y VPN',()=>{
 const ipv4=address=>({family:'IPv4',internal:false,address});
 const addresses=lanAddresses({lo:[{...ipv4('127.0.0.1'),internal:true}],docker0:[ipv4('172.17.0.1')],tailscale0:[ipv4('100.64.0.1')],eth0:[ipv4('10.0.0.8')],wlan0:[ipv4('192.168.190.50')]});
 assert.deepEqual(addresses,['192.168.190.50','10.0.0.8']);
 assert.equal(developmentUrl('0.0.0.0',4310,addresses),'http://192.168.190.50:4310');
});

test('El acceso solo local no publica la IP de otra interfaz',()=>{
 assert.equal(developmentUrl('127.0.0.1',4310,['192.168.1.5']),'http://localhost:4310');
 assert.equal(developmentUrl('192.168.1.5',4310,[]),'http://192.168.1.5:4310');
});

test('Las escrituras y nuevas tareas generan IDs sin randomUUID en HTTP de red local',()=>{
 const insecureContextCrypto={getRandomValues:globalThis.crypto.getRandomValues.bind(globalThis.crypto)};
 assert.equal(insecureContextCrypto.randomUUID,undefined);
 const ids=new Set(Array.from({length:100},()=>requestId(insecureContextCrypto)));
 assert.equal(ids.size,100);
 for(const id of ids)assert.match(id,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
});
