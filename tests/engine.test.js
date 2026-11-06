const { test } = require('node:test');
const assert = require('node:assert/strict');
const { LEVELS, SEED, generate, solutions, candidates } = require('../engine');

test('17-clue seed has exactly one valid solution', () => {
  const seed = [...SEED].map(Number);
  assert.equal(seed.filter(Boolean).length,17);
  const result = solutions(seed);
  assert.equal(result.length,1);
  assert.ok(result[0].every(Boolean));
});
for (let level = 0; level < LEVELS.length; level++) {
  test(`${LEVELS[level].name}: exact clue count and unique valid solution across random transformations`, () => {
    for (let run = 0; run < 12; run++) {
      const { puzzle, solution } = generate(level);
      assert.equal(puzzle.filter(Boolean).length,LEVELS[level].clues);
      assert.ok(puzzle.every((n,i) => !n || n === solution[i]));
      const solved = solutions(puzzle);
      assert.equal(solved.length,1);
      assert.deepEqual(solved[0],solution);
    }
  });
}
test('generation varies and rejects invalid difficulty', () => {
  assert.notDeepEqual(generate(5).puzzle,generate(5).puzzle);
  assert.throws(() => generate(-1),RangeError);
  assert.throws(() => generate(6),RangeError);
});
test('solver rejects conflicting and malformed boards', () => {
  const board = Array(81).fill(0); board[0] = 1; board[1] = 1;
  assert.deepEqual(solutions(board),[]);
  assert.deepEqual(solutions([0]),[]);
  assert.ok(!candidates(board,9).includes(1));
});
