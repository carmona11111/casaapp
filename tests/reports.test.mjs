import {test} from 'node:test';
import assert from 'node:assert/strict';
import {latestReportSunday} from '../server/reports.mjs';

test('Mickey publica el informe cada domingo a las 19:00 de Madrid',()=>{
 assert.equal(latestReportSunday(new Date('2026-10-25T17:59:00Z')),'2026-10-18');
 assert.equal(latestReportSunday(new Date('2026-10-25T18:00:00Z')),'2026-10-25');
 assert.equal(latestReportSunday(new Date('2026-10-26T12:00:00Z')),'2026-10-25');
});
