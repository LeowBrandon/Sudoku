"""Dependency-free Sudoku generation and solving for both updated notebooks."""
import random

SEED_17 = '000000010400000000020000000000050407008000300001090000300400200050100000000806000'
CLUES = (40, 32, 25, 22, 19, 17)

def solve_sudoku(board, limit=2):
    """Return up to limit solutions without changing a 9x9 board. Reject invalid input."""
    if len(board) != 9 or any(len(row) != 9 for row in board):
        raise ValueError('Expected a 9x9 board')
    values = [v for row in board for v in row]
    if any(type(v) is not int or not 0 <= v <= 9 for v in values):
        raise ValueError('Cells must be integers from 0 to 9')
    rows, cols, boxes = [0] * 9, [0] * 9, [0] * 9
    for i, v in enumerate(values):
        if not v:
            continue
        r, c = divmod(i, 9)
        b, bit = r // 3 * 3 + c // 3, 1 << v
        if (rows[r] | cols[c] | boxes[b]) & bit:
            return []
        rows[r] |= bit
        cols[c] |= bit
        boxes[b] |= bit
    found = []
    def search():
        index, mask, size = -1, 0, 10
        for i, v in enumerate(values):
            if v:
                continue
            r, c = divmod(i, 9)
            b = r // 3 * 3 + c // 3
            options = 0x3FE & ~(rows[r] | cols[c] | boxes[b])
            count = options.bit_count()
            if not count:
                return
            if count < size:
                index, mask, size = i, options, count
            if count == 1:
                break
        if index == -1:
            found.append([values[r * 9:r * 9 + 9] for r in range(9)])
            return
        r, c = divmod(index, 9)
        b = r // 3 * 3 + c // 3
        while mask:
            bit = mask & -mask
            mask ^= bit
            values[index] = bit.bit_length() - 1
            rows[r] |= bit
            cols[c] |= bit
            boxes[b] |= bit
            search()
            rows[r] ^= bit
            cols[c] ^= bit
            boxes[b] ^= bit
            values[index] = 0
            if len(found) >= limit:
                return
    search()
    return found

def create_puzzle(clues=40, seed=None):
    """Generate exactly clues givens with one solution; seeded runs are reproducible."""
    if type(clues) is not int or not 17 <= clues <= 81:
        raise ValueError('clues must be an integer from 17 to 81')
    rng = random.Random(seed)
    original = [int(v) for v in SEED_17]
    solved = solve_sudoku([original[r * 9:r * 9 + 9] for r in range(9)], 1)[0]
    def order():
        return [b * 3 + n for b in rng.sample(range(3), 3) for n in rng.sample(range(3), 3)]
    rows, cols = order(), order()
    digits = [0] + rng.sample(range(1, 10), 9)
    transpose = rng.choice([False, True])
    puzzle, solution = [], []
    for r in range(9):
        for c in range(9):
            sr, sc = (cols[c], rows[r]) if transpose else (rows[r], cols[c])
            puzzle.append(digits[original[sr * 9 + sc]])
            solution.append(digits[solved[sr][sc]])
    for i in rng.sample([i for i, v in enumerate(puzzle) if not v], clues - 17):
        puzzle[i] = solution[i]
    return ([puzzle[r * 9:r * 9 + 9] for r in range(9)],
            [solution[r * 9:r * 9 + 9] for r in range(9)])
