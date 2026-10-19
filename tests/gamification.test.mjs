import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from '../server/store.mjs';
import {savingsRewards} from '../server/gamification.mjs';
import {poolState} from '../server/pools.mjs';

test('El bonus de ahorro se concede una vez por semana y la racha cruza el domingo',()=>{
 const directory=mkdtempSync(join(tmpdir(),'casa-game-'));
 const db=openStore(join(directory,'home.sqlite'));
 try{
  const insert=db.prepare('INSERT INTO savings_entries VALUES (?,?,?,?,?)');
  insert.run('a','ivan',100,'Primera','2026-10-18T12:00:00.000Z');
  insert.run('b','person2',200,'Segunda','2026-10-18T13:00:00.000Z');
  insert.run('c','person2',300,'Nueva semana','2026-10-19T12:00:00.000Z');
  const epoch='2026-10-17T00:00:00.000Z';
  db.prepare('UPDATE score_epoch SET started_at=? WHERE id=1').run(epoch);
  assert.deepEqual(savingsRewards(db,epoch).map(x=>x.person_id),['ivan','person2']);
  const state=poolState(db,'2026-10-19');
  assert.equal(state.totals.reduce((sum,row)=>sum+row.points,0),20);
  assert.equal(state.week.points,10);
  assert.equal(state.gamification.streak.current,2);
  assert.equal(state.gamification.savings.weeklyReward,true);
 }finally{db.close();rmSync(directory,{recursive:true,force:true});}
});
