import contextlib
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from sudoku_core import CLUES, create_puzzle, solve_sudoku

class NotebookTests(unittest.TestCase):
    def test_clues_and_unique_solutions(self):
        for clues in CLUES:
            for seed in range(5):
                puzzle, solution = create_puzzle(clues, seed)
                before = [row[:] for row in puzzle]
                self.assertEqual(sum(v != 0 for row in puzzle for v in row), clues)
                self.assertEqual(solve_sudoku(puzzle), [solution])
                self.assertEqual(puzzle, before)

    def test_invalid_and_conflicting_boards(self):
        with self.assertRaises(ValueError):
            solve_sudoku([[0]])
        invalid = [[0] * 9 for _ in range(9)]
        invalid[0][0] = invalid[0][1] = 1
        self.assertEqual(solve_sudoku(invalid), [])
        with self.assertRaises(ValueError):
            create_puzzle(16)
        with self.assertRaises(ValueError):
            create_puzzle(82)

    def test_reproducible_seed(self):
        self.assertEqual(create_puzzle(25, 1000), create_puzzle(25, 1000))

    def test_every_notebook_code_cell_and_exact_html_export(self):
        paths = list((ROOT / 'notebooks').glob('*.ipynb'))
        self.assertEqual(len(paths), 1)
        notebook = json.loads(paths[0].read_text())
        self.assertEqual(notebook['nbformat'], 4)
        core_cell = next(c for c in notebook['cells'] if c['id'] == 'corrected-core')
        self.assertEqual(''.join(core_cell['source']), (ROOT / 'sudoku_core.py').read_text())
        namespace = {'__name__': '__main__'}
        original_dir = Path.cwd()
        with tempfile.TemporaryDirectory() as temporary:
            try:
                os.chdir(temporary)
                with contextlib.redirect_stdout(io.StringIO()):
                    for i, cell in enumerate(notebook['cells']):
                        if cell['cell_type'] == 'code':
                            self.assertEqual(cell['outputs'], [])
                            exec(compile(''.join(cell['source']), f'notebook-cell-{i}', 'exec'), namespace)
                self.assertEqual(namespace['WEB_PAGE'], (ROOT / 'index.html').read_text())
                self.assertEqual(namespace['page_path'].read_text(), namespace['WEB_PAGE'])
                self.assertIn('sandbox="allow-scripts allow-downloads"', namespace['iframe_markup'])
            finally:
                os.chdir(original_dir)

if __name__ == '__main__':
    unittest.main(verbosity=2)
