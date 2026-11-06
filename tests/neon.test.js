const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
// The earlier engine is retained as an independent uniqueness oracle.
const reference = require('../engine');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const algorithm = html.match(/<script>([\s\S]*?)<\/script>/)[1].split('const DIFFICULTIES')[0];
const context = vm.createContext({ setTimeout });
vm.runInContext(algorithm, context);

for (const count of [42,34,27,23,19,17]) {
  test(`Neon: ${count} clues, unique solution and fast valid solver`, async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const result = await context.makePuzzle(count, 200, () => {});
      const board = Array.from(result.puzzle);
      assert.equal(board.filter(Boolean).length, count);
      assert.equal(result.givens, count);
      const before = board.slice();
      assert.equal(context.countSolutions(board, 2), 1);
      assert.deepEqual(board, before, 'solution counting must not modify clues');
      const expected = reference.solutions(board);
      assert.equal(expected.length, 1, 'independent solver confirms uniqueness');
      context.testBoard = board;
      assert.equal(vm.runInContext('solveBoard(testBoard)', context, { timeout: 1500 }), true);
      assert.deepEqual(board, expected[0]);
    }
  });
}
test('Neon: timeout fallback keeps the exact requested clue count', async () => {
  const result = await context.makePuzzle(23, 0);
  assert.equal(result.puzzle.filter(Boolean).length, 23);
  assert.equal(result.givens, 23);
  assert.equal(context.countSolutions(result.puzzle.slice(), 2), 1);
});
test('Neon: invalid boards are rejected', () => {
  const board = Array(81).fill(0); board[0] = board[1] = 2;
  assert.equal(context.solveBoard(board), false);
  assert.equal(context.countSolutions(board, 2), -1);
  assert.equal(context.solveBoard([0]), false);
});
test('Neon: saved browser state is removed from source', () => {
  assert.doesNotMatch(html, /saved from url=|<div class="star" style=/);
  assert.match(html, /id="board"[^>]*><\/div>/);
  assert.match(html, /class="diff-btn active" data-diff="easy"/);
});
