const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const reference=require('../engine');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const context=vm.createContext({window:{}});
vm.runInContext(html.match(/<script id="sudoku-core">([\s\S]*?)<\/script>/)[1],context);
const {solve,generate,LEVELS}=context.window.SudokuCore;
const plain=value=>JSON.parse(JSON.stringify(value));
for(let level=0;level<6;level++)test(`${LEVELS[level].name}: correct clues and independently verified unique solution`,()=>{
  for(let attempt=0;attempt<6;attempt++){
    const {puzzle,solution}=plain(generate(level));
    assert.equal(puzzle.filter(Boolean).length,LEVELS[level].clues);
    assert.deepEqual(reference.solutions(puzzle),[solution]);
    const before=puzzle.slice();assert.deepEqual(plain(solve(puzzle).solutions),[solution]);assert.deepEqual(puzzle,before);
  }
});
test('backtracking events replay to the correct solution without changing clues',()=>{
  const puzzle=[...'000000010400000000020000000000050407008000300001090000300400200050100000000806000'].map(Number);
  const result=plain(solve(puzzle,1,true));assert.equal(result.solutions.length,1);
  assert.ok(result.events.some(e=>e.kind==='backtrack'),'trace must include real reversals');
  const replay=puzzle.slice();for(const event of result.events){assert.equal(puzzle[event.index],0);replay[event.index]=event.value;}
  assert.deepEqual(replay,result.solutions[0]);
  assert.deepEqual(reference.solutions(puzzle),[replay]);
});
test('invalid and conflicting boards are rejected',()=>{
  const bad=Array(81).fill(0);bad[0]=bad[1]=1;
  assert.equal(solve(bad).solutions.length,0);assert.equal(solve([0]).solutions.length,0);
  assert.throws(()=>generate(6));
});
