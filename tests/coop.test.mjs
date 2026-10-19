import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from '../server/store.mjs';
import {initializePools,poolAction,poolState,pointsFor} from '../server/pools.mjs';
import {addSavings,removeSavings,savingsState} from '../server/savings.mjs';
import {coopState,recordCoopEvent,setCoopPlan,transferToFund,redeemReward,chooseSticker,confirmFairWeek,setMonthlyGoal} from '../server/coop.mjs';
import {addDays,localDate,monday} from '../server/dates.mjs';
import {saveRecipe,setMeal,setMealCompletion,rateRecipe} from '../server/meals.mjs';

test('Las misiones, stickers y premios están visibles desde el primer día',()=>{
 const dir=mkdtempSync(join(tmpdir(),'casa-coop-preview-'));
 const db=openStore(join(dir,'db.sqlite'));
 try{
  const state=poolState(db);
  assert.equal(state.coop.missions.length,3);
  assert.ok(state.coop.badges.length>=20);
  assert.ok(state.coop.rewards.length>=8);
  assert.equal(state.coop.keys.balance,0);
  assert.ok(state.coop.badges.some(badge=>!badge.earned&&badge.hint));
  assert.ok(state.coop.rewards.some(reward=>reward.keys>0));
 }finally{db.close();rmSync(dir,{recursive:true,force:true});}
});

test('XP por esfuerzo, misión cooperativa, llaves y fondo permanecen tras reabrir la base',()=>{
 const dir=mkdtempSync(join(tmpdir(),'casa-coop-'));let db;
 try{
  assert.deepEqual([1,5,6,15,16,30,31,60,61].map(pointsFor),[5,5,10,10,20,20,30,30,30]);
  const today=localDate(),week=monday(today);
  db=openStore(join(dir,'db.sqlite'));initializePools(db);
  setCoopPlan(db,{week_start:week,target_xp:50,essentials:['t1']});
  poolAction(db,{template_id:'t1',actor:'ivan',action:'claim'},today);
  poolAction(db,{template_id:'t1',actor:'ivan',action:'complete'},today);
  recordCoopEvent(db,{actor:'person2',kind:'joint_clean',amount:30});
  recordCoopEvent(db,{actor:'ivan',kind:'review',amount:10});
  addSavings(db,{actor:'person2',amount_cents:10000,note:'Aporte real'});
  let state=poolState(db,today);
  assert.equal(state.coop.missions.find(x=>x.id==='home').earned,false);
  assert.equal(state.coop.missions.find(x=>x.id==='team').earned,true);
  assert.equal(state.coop.keys.balance,1);
  assert.equal(state.coop.badges.find(x=>x.id==='joint_first').earned,true);
  chooseSticker(db,{actor:'ivan',badge_id:'joint_first'});
  assert.equal(coopState(db).selectedSticker.icon,'🏡');
  assert.equal(state.totals.find(x=>x.person_id==='ivan').points>0,true);
  assert.equal(state.totals.find(x=>x.person_id==='person2').points>0,true);
  assert.throws(()=>recordCoopEvent(db,{actor:'person2',kind:'review',amount:10}),/registrado/);
  assert.throws(()=>transferToFund(db,{actor:'ivan',amount_cents:2501}),/25 %/);
  transferToFund(db,{actor:'ivan',amount_cents:2500});
  assert.equal(savingsState(db).total_cents,7500);
  addSavings(db,{actor:'ivan',amount_cents:3000,note:'Aporte adicional'});
  const transferEntry=db.prepare("SELECT id FROM savings_entries WHERE note='Traspaso al fondo de disfrute'").get();
  const depositEntry=db.prepare("SELECT id FROM savings_entries WHERE note='Aporte real'").get();
  assert.throws(()=>removeSavings(db,{actor:'ivan',id:transferEntry.id}),/no se puede borrar/);
  assert.throws(()=>removeSavings(db,{actor:'person2',id:depositEntry.id}),/fondo de disfrute/);
  redeemReward(db,{actor:'ivan',reward_key:'movie',amount_cents:0});
  assert.throws(()=>redeemReward(db,{actor:'person2',reward_key:'movie',amount_cents:0}),/llaves/);
  state=poolState(db,today);
  assert.equal(state.coop.keys.balance,0);
  assert.equal(state.coop.fund.balance_cents,2500);
  db.close();db=undefined;
  db=openStore(join(dir,'db.sqlite'));
  state=poolState(db,today);
  assert.equal(state.coop.keys.balance,0);
  assert.equal(state.coop.fund.balance_cents,2500);
  assert.equal(state.coop.redemptions.length,1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM coop_transfers').get().n,1);
  assert.equal(coopState(db).badges.find(x=>x.id==='joint_first').earned,true);
  assert.equal(coopState(db).selectedSticker.icon,'🏡');
  const award=db.prepare('INSERT OR IGNORE INTO coop_awards VALUES (?,?,?)');
  award.run(week,'home',new Date().toISOString());
  award.run(week,'kitchen',new Date().toISOString());
  award.run(addDays(week,-7),'team',new Date().toISOString());
  assert.equal(coopState(db).keys.balance,3);
  redeemReward(db,{actor:'person2',reward_key:'treat',amount_cents:1500});
  assert.equal(coopState(db).fund.balance_cents,1000);
  assert.equal(coopState(db).keys.balance,0);
  assert.equal(savingsState(db).total_cents,10500);
  setMonthlyGoal(db,{actor:'ivan',target_cents:10000});
  assert.equal(coopState(db).monthly.reached,true);
  assert.equal(coopState(db).keys.balance,0,'la meta del mes abierto no entrega llaves todavía');
  const priorMonth=addDays(today.slice(0,7)+'-01',-1).slice(0,7);
  db.prepare('INSERT INTO coop_monthly_goals VALUES (?,?,?,?)').run(priorMonth,1000,'ivan',new Date().toISOString());
  db.prepare('INSERT INTO savings_entries VALUES (?,?,?,?,?)').run('prior-deposit','ivan',1000,'Ahorro del mes anterior',`${priorMonth}-15T12:00:00.000Z`);
  assert.equal(coopState(db).keys.balance,2,'la meta del mes cerrado entrega dos llaves una vez');
  assert.equal(coopState(db).keys.balance,2);
  assert.throws(()=>removeSavings(db,{actor:'ivan',id:'prior-deposit'}),/mes premiado/);
  confirmFairWeek(db,{actor:'ivan'});confirmFairWeek(db,{actor:'person2'});
  assert.equal(coopState(db).fair.weeks,1);
  assert.throws(()=>confirmFairWeek(db,{actor:'ivan'}),/Ya confirmaste/);
  const prior=addDays(week,-7);
  db.prepare('INSERT OR IGNORE INTO coop_weeks VALUES (?,?,?)').run(prior,50,'[]');
  db.prepare('INSERT INTO task_completions VALUES (?,?,?,?,?,?,?,?,?)').run('fair-prior','t3','ivan',new Date().toISOString(),prior,prior,25,'Sesión anterior','Salón');
  db.prepare('INSERT INTO coop_fair_votes VALUES (?,?,?)').run(prior,'ivan',new Date().toISOString());
  db.prepare('INSERT INTO coop_fair_votes VALUES (?,?,?)').run(prior,'person2',new Date().toISOString());
  assert.equal(coopState(db).fair.weeks,2);
  assert.equal(coopState(db).badges.find(x=>x.id==='fair_load').earned,true);
  assert.equal(coopState(db).keys.balance,3);
 }finally{db?.close();rmSync(dir,{recursive:true,force:true});}
});

test('las nuevas tablas se añaden a una base anterior sin borrar recetas, ahorro ni tareas',()=>{
 const dir=mkdtempSync(join(tmpdir(),'casa-upgrade-'));let db;
 try{
  const path=join(dir,'existing.sqlite');
  db=openStore(path);
  db.prepare('INSERT INTO savings_entries VALUES (?,?,?,?,?)').run('old-saving','ivan',5000,'Antes de Co-op',new Date().toISOString());
  db.prepare('INSERT INTO recipes VALUES (?,?,?,?,?)').run('old-recipe','Receta anterior',null,'[{"name":"Arroz","quantity":1,"unit":"kg"}]',new Date().toISOString());
  db.exec('DROP TABLE recipe_ratings; DROP TABLE coop_monthly_awards; DROP TABLE coop_monthly_goals; DROP TABLE coop_fair_votes; DROP TABLE coop_transfers; DROP TABLE coop_week_modes; DROP TABLE coop_profile; DROP TABLE coop_task_shares; DROP TABLE coop_redemptions; DROP TABLE coop_fund; DROP TABLE coop_unlocks; DROP TABLE coop_awards; DROP TABLE coop_events; DROP TABLE coop_weeks;');
  db.close();db=undefined;
  db=openStore(path);
  assert.equal(db.prepare('SELECT amount_cents FROM savings_entries WHERE id=?').get('old-saving').amount_cents,5000);
  assert.equal(db.prepare('SELECT name FROM recipes WHERE id=?').get('old-recipe').name,'Receta anterior');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM templates').get().n>0,true);
  assert.equal(coopState(db).keys.balance,0);
 }finally{db?.close();rmSync(dir,{recursive:true,force:true});}
});

test('Recetario en expansión exige cinco recetas cocinadas y valoradas',()=>{
 const dir=mkdtempSync(join(tmpdir(),'casa-recipes-'));let db;
 try{
  db=openStore(join(dir,'recipes.sqlite'));
  const today=localDate();
  for(let i=0;i<5;i++){
   const name=`Receta ${i+1}`,date=addDays(today,-i);
   saveRecipe(db,{name,photo:null,ingredients:[{name:'Arroz',quantity:1,unit:'ud'}]});
   const recipe=db.prepare('SELECT id FROM recipes WHERE name=?').get(name);
   setMeal(db,{date,slot:'dinner',recipe_id:recipe.id});
   setMealCompletion(db,{date,slot:'dinner',actor:'ivan',completed:true});
   if(i<4)rateRecipe(db,{actor:'person2',recipe_id:recipe.id,rating:5});
  }
  assert.equal(coopState(db).badges.find(x=>x.id==='recipe_collection').earned,false);
  const fifth=db.prepare("SELECT id FROM recipes WHERE name='Receta 5'").get();
  rateRecipe(db,{actor:'person2',recipe_id:fifth.id,rating:4});
  assert.equal(coopState(db).badges.find(x=>x.id==='recipe_collection').earned,true);
  setMealCompletion(db,{date:addDays(today,-4),slot:'dinner',actor:'ivan',completed:false});
  assert.equal(db.prepare('SELECT 1 FROM recipe_ratings WHERE recipe_id=?').get(fifth.id),undefined);
 }finally{db?.close();rmSync(dir,{recursive:true,force:true});}
});
