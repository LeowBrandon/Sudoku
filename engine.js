/* A verified 17-clue seed; Sudoku symmetries preserve its unique solution. */
(function (root) {
  'use strict';
  const LEVELS = [
    { name: '简单', clues: 40, label: '轻松入门', description: '让直觉热身，找回专注的节奏。' },
    { name: '中等', clues: 32, label: '渐入佳境', description: '多一点推理，多一点发现的乐趣。' },
    { name: '困难', clues: 25, label: '深度专注', description: '只留 25 个线索，让每一步都有意义。' },
    { name: '专家', clues: 22, label: '逻辑进阶', description: '22 个线索，在留白中寻找突破。' },
    { name: '地狱', clues: 19, label: '极限挑战', description: '仅 19 个线索，耐心是你的秘密武器。' },
    { name: '梦寐', clues: 17, label: '极简之境', description: '17 个线索，抵达唯一解数独的最少线索边界。' }
  ];
  const SEED = '000000010400000000020000000000050407008000300001090000300400200050100000000806000';
  function candidates(board, index) {
    const row = Math.floor(index / 9), col = index % 9;
    const used = new Set();
    for (let k = 0; k < 9; k++) {
      used.add(board[row * 9 + k]);
      used.add(board[k * 9 + col]);
      used.add(board[(Math.floor(row / 3) * 3 + Math.floor(k / 3)) * 9 + Math.floor(col / 3) * 3 + k % 3]);
    }
    return [1,2,3,4,5,6,7,8,9].filter(n => !used.has(n));
  }
  function solutions(input, limit = 2) {
    const board = input.slice(), found = [];
    if (board.length !== 81 || board.some(n => !Number.isInteger(n) || n < 0 || n > 9)) return found;
    for (let i = 0; i < 81; i++) {
      if (!board[i]) continue;
      const n = board[i]; board[i] = 0;
      const valid = candidates(board, i).includes(n); board[i] = n;
      if (!valid) return found;
    }
    function search() {
      let target = -1, options;
      for (let i = 0; i < 81; i++) {
        if (board[i]) continue;
        const c = candidates(board, i);
        if (!c.length) return;
        if (!options || c.length < options.length) { target = i; options = c; }
        if (c.length === 1) break;
      }
      if (target === -1) { found.push(board.slice()); return; }
      for (const n of options) {
        board[target] = n; search(); board[target] = 0;
        if (found.length >= limit) return;
      }
    }
    search(); return found;
  }
  function shuffle(items) {
    const a = items.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const seedSolution = solutions([...SEED].map(Number), 1)[0];
  function generate(level = 0) {
    if (!Number.isInteger(level) || !LEVELS[level]) throw new RangeError('Unknown difficulty');
    const digits = [0, ...shuffle([1,2,3,4,5,6,7,8,9])];
    const order = () => shuffle([0,1,2]).flatMap(b => shuffle([0,1,2]).map(n => b * 3 + n));
    const rows = order(), cols = order(), transpose = Math.random() < 0.5;
    const puzzle = [], solution = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      const i = transpose ? cols[c] * 9 + rows[r] : rows[r] * 9 + cols[c];
      puzzle.push(digits[Number(SEED[i])]); solution.push(digits[seedSolution[i]]);
    }
    const extras = shuffle(puzzle.map((n, i) => n ? -1 : i).filter(i => i !== -1));
    for (let n = 17; n < LEVELS[level].clues; n++) { const i = extras.pop(); puzzle[i] = solution[i]; }
    return { puzzle, solution, level };
  }
  const api = { LEVELS, SEED, candidates, solutions, generate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Sudoku = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
