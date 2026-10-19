import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from '../server/store.mjs';
import {addSavings} from '../server/savings.mjs';
import {transferToFund} from '../server/coop.mjs';
import {financeState} from '../server/finance.mjs';
import {localDate} from '../server/dates.mjs';

test('un traspaso al fondo sigue reservado y no infla el margen mensual',()=>{
 const dir=mkdtempSync(join(tmpdir(),'casa-finance-'));
 const db=openStore(join(dir,'home.sqlite'));
 try{
  addSavings(db,{actor:'ivan',amount_cents:10000,note:'Reserva de octubre'});
  transferToFund(db,{actor:'ivan',amount_cents:2500});
  const state=financeState(db,localDate().slice(0,7));
  assert.equal(state.savings_cents,10000);
  assert.equal(state.available_cents,-10000);
  assert.equal(state.by_person.find(row=>row.person_id==='ivan').saved_cents,10000);
 }finally{db.close();rmSync(dir,{recursive:true,force:true});}
});
