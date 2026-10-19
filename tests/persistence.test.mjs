import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from '../server/store.mjs';
import {initializePools,poolAction,poolState} from '../server/pools.mjs';
import {mealsState,saveRecipe,setMeal,setMealCompletion,setNoDelivery,setShoppingCheck} from '../server/meals.mjs';
import {savingsState,addSavings} from '../server/savings.mjs';
import {localDate,monday} from '../server/dates.mjs';

test('los dos perfiles conservan y comparten tareas, comidas, compra, ahorro y puntos tras reabrir SQLite',()=>{
 const dir=mkdtempSync(join(tmpdir(),'casa-persistence-'));
 const path=join(dir,'casa.sqlite');
 let db;
 try{
  const today=localDate(),week=monday(today);
  db=openStore(path);
  initializePools(db);
  assert.deepEqual(db.prepare('SELECT id FROM people ORDER BY rowid').all().map(x=>x.id),['ivan','person2']);
  poolAction(db,{template_id:'t1',actor:'ivan',action:'claim'},today);
  poolAction(db,{template_id:'t1',actor:'ivan',action:'complete'},today);
  poolAction(db,{template_id:'t2',actor:'person2',action:'claim'},today);
  poolAction(db,{template_id:'t2',actor:'person2',action:'complete'},today);
  saveRecipe(db,{name:'Cena compartida',photo:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==',ingredients:[{name:'Tomate',quantity:2,unit:'ud'}]});
  const recipe=mealsState(db,week).recipes[0];
  setMeal(db,{date:today,slot:'dinner',recipe_id:recipe.id});
  const ingredient=mealsState(db,week).shopping[0];
  setShoppingCheck(db,{week_start:week,key:ingredient.key,checked:true});
  setMealCompletion(db,{date:today,slot:'dinner',actor:'person2',completed:true});
  setNoDelivery(db,{date:today,actor:'ivan',done:true,saved_cents:1500});
  addSavings(db,{actor:'ivan',amount_cents:2500,note:'Fondo común'});
  const before=poolState(db,today);
  assert.ok(before.totals.find(x=>x.person_id==='ivan').points>0);
  assert.ok(before.totals.find(x=>x.person_id==='person2').points>0);
  db.close();db=undefined;

  db=openStore(path);
  const shared=poolState(db,today),meals=mealsState(db,week),savings=savingsState(db);
  assert.deepEqual(shared.totals,before.totals);
  assert.deepEqual(shared.people.map(x=>x.id),['ivan','person2']);
  assert.equal(shared.tasks.find(x=>x.id==='t1').available,false);
  assert.equal(shared.tasks.find(x=>x.id==='t2').available,false);
  assert.equal(shared.completions.find(x=>x.template_id==='t1').person_id,'ivan');
  assert.equal(shared.completions.find(x=>x.template_id==='t2').person_id,'person2');
  assert.equal(meals.recipes[0].photo,recipe.photo);
  assert.equal(meals.plan[0].recipe_id,recipe.id);
  assert.equal(meals.shopping[0].checked,true);
  assert.equal(meals.completed[0].person_id,'person2');
  assert.equal(meals.noDelivery[0].person_id,'ivan');
  assert.equal(savings.total_cents,2500);
  assert.equal(savings.entries[0].person_id,'ivan');
 }finally{db?.close();rmSync(dir,{recursive:true,force:true});}
});
