const test=require('node:test');const assert=require('node:assert/strict');
const {cosineSimilarity}=require('../src/lib/similarity');let imageUnderstandingSchema;try{({imageUnderstandingSchema}=require('../src/lib/schemas'));}catch{}
const {evaluateCandidate}=require('../src/services/guardService');
test('cosine similarity returns 1 for identical vectors',()=>assert.equal(cosineSimilarity([1,2,3],[1,2,3]),1));
test('cosine similarity returns 0 for orthogonal vectors',()=>assert.equal(cosineSimilarity([1,0],[0,1]),0));
test('cosine similarity safely rejects invalid dimensions',()=>assert.equal(cosineSimilarity([1],[1,2]),0));
test('vision schema accepts valid structured output',{skip:!imageUnderstandingSchema},()=>assert.equal(imageUnderstandingSchema.safeParse({subject:'red fox',category:'animal',attributes:['orange fur'],caption:'A red fox in a forest',confidence:.94}).success,true));
test('vision schema rejects invalid confidence',{skip:!imageUnderstandingSchema},()=>assert.equal(imageUnderstandingSchema.safeParse({subject:'fox',category:'animal',attributes:[],caption:'A fox',confidence:1.4}).success,false));
test('mismatch guard rejects wolf for red fox post',()=>{const r=evaluateCandidate({post:{expected_category:'animal',expected_subject:'red fox'},metadata:{subject:'gray wolf',category:'animal',confidence:.95},similarity:.9});assert.equal(r.accepted,false);assert.match(r.reason,/Subject mismatch/);});
test('mismatch guard rejects category mismatch',()=>{const r=evaluateCandidate({post:{expected_category:'animal',expected_subject:'red fox'},metadata:{subject:'red fox',category:'vehicle',confidence:.95},similarity:.9});assert.equal(r.accepted,false);assert.match(r.reason,/Category mismatch/);});
test('mismatch guard accepts a confident exact match',()=>{const r=evaluateCandidate({post:{expected_category:'animal',expected_subject:'red fox'},metadata:{subject:'red fox',category:'animal',confidence:.98},similarity:.9});assert.equal(r.accepted,true);});
