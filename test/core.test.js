import test from 'node:test'; import assert from 'node:assert/strict';
import { countFromLikes } from '../shared/constants.js'; import { subtitleAt } from '../shared/subtitles.js';
import { normalizeEvent } from '../connector/eventNormalizer.js';
test('likes create one character per 50 up to 20',()=>{assert.equal(countFromLikes(0),1);assert.equal(countFromLikes(49),1);assert.equal(countFromLikes(50),2);assert.equal(countFromLikes(950),20);assert.equal(countFromLikes(5000),20)});
test('subtitle language falls back to Thai',()=>{const rows=[{start:0,end:2,text_th:'สวัสดี',text_en:''}];assert.equal(subtitleAt(rows,1,'en'),'สวัสดี');assert.equal(subtitleAt(rows,3,'th'),'')});
test('connector rejects unknown events',()=>{assert.equal(normalizeEvent({id:'1',type:'comment'}),null);assert.equal(normalizeEvent({id:'2',type:'like',count:10}).count,10)});
