import {randomUUID} from 'node:crypto';
import {localDate,validDate} from './dates.mjs';
import {fail} from './store.mjs';

const categories={income:['Nómina','Extra','Otros'],expense:['Casa','Supermercado','Transporte','Ocio','Salud','Otros']};
const people=db=>db.prepare('SELECT id,name FROM people WHERE active=1 ORDER BY rowid').all();
const allEntries=db=>db.prepare('SELECT * FROM finance_entries ORDER BY occurred_on DESC,created_at DESC,rowid DESC').all().map(row=>({...row,shares:JSON.parse(row.shares_json)}));

export function balances(db,rows=allEntries(db)){
 const result=Object.fromEntries(people(db).map(person=>[person.id,0]));
 for(const row of rows){
  if(row.kind==='expense'){
   result[row.paid_by]+=row.amount_cents;
   for(const share of row.shares)result[share.person_id]-=share.amount_cents;
  }else if(row.kind==='settlement'){
   result[row.paid_by]+=row.amount_cents;
   result[row.other_person_id]-=row.amount_cents;
  }
 }
 return result;
}

export function financeState(db,month=localDate().slice(0,7)){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))fail(400,'Mes no válido.');
 const rows=allEntries(db),current=rows.filter(row=>row.occurred_on.startsWith(month));
 const peopleRows=people(db);
 const income_cents=current.filter(row=>row.kind==='income').reduce((sum,row)=>sum+row.amount_cents,0);
 const expense_cents=current.filter(row=>row.kind==='expense').reduce((sum,row)=>sum+row.amount_cents,0);
 const saved=db.prepare('SELECT person_id,amount_cents,created_at FROM savings_entries').all().filter(row=>localDate(new Date(row.created_at)).startsWith(month));
 const fund=db.prepare('SELECT person_id,amount_cents,created_at FROM coop_fund').all().filter(row=>localDate(new Date(row.created_at)).startsWith(month));
 const savings_cents=[...saved,...fund].reduce((sum,row)=>sum+row.amount_cents,0);
 const by_category=categories.expense.map(category=>({category,amount_cents:current.filter(row=>row.kind==='expense'&&row.category===category).reduce((sum,row)=>sum+row.amount_cents,0)})).filter(row=>row.amount_cents>0);
 const by_person=peopleRows.map(person=>({person_id:person.id,income_cents:current.filter(row=>row.kind==='income'&&row.paid_by===person.id).reduce((sum,row)=>sum+row.amount_cents,0),paid_cents:current.filter(row=>row.kind==='expense'&&row.paid_by===person.id).reduce((sum,row)=>sum+row.amount_cents,0),saved_cents:[...saved,...fund].filter(row=>row.person_id===person.id).reduce((sum,row)=>sum+row.amount_cents,0)}));
 return {month,people:peopleRows,entries:current.slice(0,200),balances:balances(db,rows),income_cents,expense_cents,savings_cents,available_cents:income_cents-expense_cents-savings_cents,by_category,by_person,categories};
}

export function addFinanceEntry(db,entry){
 const members=people(db).map(person=>person.id);
 if(!members.includes(entry.paid_by)||(entry.other_person_id&&!members.includes(entry.other_person_id)))fail(400,'Selecciona un perfil válido.');
 if(!validDate(entry.occurred_on)||entry.occurred_on<'2000-01-01'||entry.occurred_on>'2100-12-31')fail(400,'Fecha no válida.');
 if(entry.kind==='income'){
  if(!categories.income.includes(entry.category)||entry.other_person_id||entry.shares.length)fail(400,'Ingreso no válido.');
 }else if(entry.kind==='expense'){
  if(!categories.expense.includes(entry.category)||entry.other_person_id||entry.shares.length!==members.length||new Set(entry.shares.map(x=>x.person_id)).size!==members.length||entry.shares.some(x=>!members.includes(x.person_id))||entry.shares.reduce((sum,x)=>sum+x.amount_cents,0)!==entry.amount_cents)fail(400,'El reparto debe sumar exactamente el importe del gasto.');
 }else{
  if(entry.category!=='Ajuste'||!entry.other_person_id||entry.other_person_id===entry.paid_by||entry.shares.length)fail(400,'Pago entre perfiles no válido.');
  const net=balances(db);
  if(net[entry.paid_by]>=0||net[entry.other_person_id]<=0||entry.amount_cents>Math.min(-net[entry.paid_by],net[entry.other_person_id]))fail(409,'El pago supera la deuda pendiente. Actualizad el saldo.');
 }
 const id=randomUUID();
 db.prepare('INSERT INTO finance_entries VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(id,entry.kind,entry.amount_cents,entry.title,entry.category,entry.occurred_on,entry.paid_by,entry.other_person_id||null,JSON.stringify(entry.shares),entry.actor,new Date().toISOString());
 return {ok:true,id};
}

export function removeFinanceEntry(db,{actor,id}){
 const row=db.prepare('SELECT recorded_by FROM finance_entries WHERE id=?').get(id);
 if(!row)fail(404,'Este movimiento ya no existe.');
 if(row.recorded_by!==actor)fail(409,'Solo quien registró el movimiento puede borrarlo.');
 db.prepare('DELETE FROM finance_entries WHERE id=?').run(id);
 return {ok:true};
}
