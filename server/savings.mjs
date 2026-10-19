import {randomUUID} from 'node:crypto';
import {localDate} from './dates.mjs';
import {fail} from './store.mjs';

export const goals=[{amount_cents:100000,title:'Viaje express',icon:'✈️'},{amount_cents:300000,title:'Disney París',icon:'🏰'},{amount_cents:1000000,title:'Disney worldwide',icon:'🌍'}];
export const preparationItems=[{key:'dates',title:'Elegir fechas'},{key:'transport',title:'Billetes reservados'},{key:'stay',title:'Hotel reservado'},{key:'budget',title:'Presupuesto revisado'}];
export function savingsState(db){
 const entries=db.prepare('SELECT * FROM savings_entries ORDER BY created_at DESC,rowid DESC LIMIT 100').all();
 const total_cents=db.prepare('SELECT COALESCE(SUM(amount_cents),0) AS amount FROM savings_entries').get().amount;
 const avoided_cents=db.prepare('SELECT COALESCE(SUM(saved_cents),0) AS amount FROM no_delivery_days').get().amount;
 return {total_cents,avoided_cents,goals,entries,preparation:db.prepare('SELECT * FROM goal_preparation').all(),preparationItems};
}
export function setPreparation(db,{actor,goal_cents,item_key,checked}){
 const goal=goals.find(g=>g.amount_cents===goal_cents);
 if(!goal||!preparationItems.some(item=>item.key===item_key))fail(400,'Paso de viaje no válido.');
 const total=db.prepare('SELECT COALESCE(SUM(amount_cents),0) AS amount FROM savings_entries').get().amount;
 if(checked&&total<goal_cents*.6)fail(409,'El plan de reservas se desbloquea al llegar al 60 % de este objetivo.');
 if(checked)db.prepare('INSERT INTO goal_preparation VALUES (?,?,?,?) ON CONFLICT(goal_cents,item_key) DO UPDATE SET checked_by=excluded.checked_by,checked_at=excluded.checked_at').run(goal_cents,item_key,actor,new Date().toISOString());
 else db.prepare('DELETE FROM goal_preparation WHERE goal_cents=? AND item_key=?').run(goal_cents,item_key);
 return {ok:true};
}
export function addSavings(db,{actor,amount_cents,note}){
 const current=db.prepare('SELECT COALESCE(SUM(amount_cents),0) AS amount FROM savings_entries').get().amount;
 if(current+amount_cents<0)fail(409,'La retirada supera el ahorro registrado.');
 db.prepare('INSERT INTO savings_entries VALUES (?,?,?,?,?)').run(randomUUID(),actor,amount_cents,note,new Date().toISOString());
 return {ok:true};
}
export function removeSavings(db,{actor,id}){
 const entry=db.prepare('SELECT person_id,amount_cents,created_at FROM savings_entries WHERE id=?').get(id);
 if(!entry)fail(404,'Este movimiento ya no existe.');
 if(entry.person_id!==actor)fail(409,'Solo quien registró el movimiento puede borrarlo.');
 if(db.prepare('SELECT 1 FROM coop_monthly_awards WHERE month=?').get(localDate(new Date(entry.created_at)).slice(0,7)))fail(409,'Este movimiento pertenece a un mes premiado y no se puede borrar.');
 if(db.prepare('SELECT 1 FROM coop_transfers WHERE savings_entry_id=?').get(id))fail(409,'Este movimiento financia el fondo de disfrute y no se puede borrar.');
 const row=db.prepare('SELECT amount_cents FROM savings_entries WHERE id=?').get(id);
 const current=db.prepare('SELECT COALESCE(SUM(amount_cents),0) AS amount FROM savings_entries').get().amount;
 if(current-row.amount_cents<0)fail(409,'Al borrar este ingreso, el saldo quedaría por debajo de cero. Revise las retiradas primero.');
 if(entry.amount_cents>0){
  const month=localDate(new Date(entry.created_at)).slice(0,7);
  const deposited=db.prepare('SELECT amount_cents,created_at FROM savings_entries WHERE amount_cents>0').all().filter(x=>localDate(new Date(x.created_at)).startsWith(month)).reduce((n,x)=>n+x.amount_cents,0)-entry.amount_cents;
  const moved=db.prepare('SELECT amount_cents,created_at FROM coop_fund WHERE amount_cents>0').all().filter(x=>localDate(new Date(x.created_at)).startsWith(month)).reduce((n,x)=>n+x.amount_cents,0);
  if(moved>Math.floor(deposited*.25))fail(409,'Primero ajustad el fondo de disfrute: este ingreso sostiene un traspaso del mes.');
 }
 db.prepare('DELETE FROM savings_entries WHERE id=?').run(id);
 return {ok:true};
}
