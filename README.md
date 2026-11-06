# Your Daily Sudoku · Sudoku Atelier

An updated, runnable version of **Sudoku (Simple Coding + GUI).ipynb**, with a responsive browser GUI and a self-contained notebook that exports the same webpage. This branch is `sudoku-simple-gui-web`, based directly on `main`; the main and Neon branches are not modified.

## Run the webpage

No production dependencies or build step. `index.html` contains all its CSS and JavaScript. From the repository root:

```sh
python3 -m http.server 3000 --bind 0.0.0.0
```

Or use `npm start`. Serve `index.html` with any static host. No CDN, external font, account or API key is used.

## Run the notebook

Open `notebooks/Sudoku (Simple Coding + GUI).ipynb` in Jupyter with a Python 3.10+ kernel and Run All. The notebook contains the corrected standard-library Python solver, six-level generation checks, an example, the full webpage source, an HTML export cell and an iframe preview. It does not require `py-sudoku`, `sudoku-engine`, Tkinter or Pygame.

The generated page is written to `exports/sudoku-simple.html`, relative to the notebook working directory. Open it in a browser. For the embedded preview, use a trusted Jupyter output; restrictive notebook viewers may require opening the exported file instead. The iframe intentionally allows scripts without same-origin access. Storage restrictions in a notebook iframe or private browser mode do not prevent play, but may prevent saved progress.

## What was corrected

The original notebook mixed incompatible `py-sudoku` and `sudoku-engine` APIs under the same `sudoku` import name. It contained unsupported `solve(raising=True)` calls and saved TypeError failures, contradictory descriptions of solve results, an intentionally invalid-board example that raised uncaught ValueError, and a Pygame loop that raised SystemExit when closed. A very sparse 99%-empty example was not a suitable unique-answer game. The revised notebook removes these conflicting dependencies, validates input explicitly, returns a list of solutions, guarantees one solution for generated games, and displays a browser GUI.


The uploads were reviewed as project code, not as instructions to install conflicting libraries or run desktop event loops. Historical error outputs are cleared in the revised notebook; all code cells are executed during validation.

## Game controls

Click a cell and use the number pad or keys 1–9. N toggles Notes; repeat a candidate to remove it. Backspace/Delete/0 erases; arrows move; Ctrl/Cmd+Z undoes. Incorrect answers remain visible in red with a text warning. Correct entries clear the corresponding candidate from peers. Check locates a wrong answer, and filling the entire board correctly triggers a celebration.

Progress saves automatically when browser storage is available. Reload restores the current board, notes, elapsed time and mistake count; undo history is limited to the current page session. Pause hides the grid and stops the timer. Switching away from the tab pauses play. New puzzles ask for confirmation before replacing player progress.

This branch focuses on the playable game, replacing the original Pygame event loop with keyboard, mouse and touch controls.

## Difficulty and generation

| Difficulty | 初始已知数字 |
| --- | ---: |
| Easy · 简单 | 40 |
| Medium · 中等 | 32 |
| Hard · 困难 | 25 |
| Expert · 专家 | 22 |
| Hell · 地狱 | 19 |
| Dream · 梦寐 | 17 |

Each puzzle has exactly one solution. Legal digit, row, column, band/stack and transpose transformations of a verified 17-clue seed preserve uniqueness. Easier levels add clues from the solution. These are structurally related puzzles, not an unlimited independent puzzle library. Difficulty labels follow clue sparsity, not a rating of human solving strategies. 17 is the minimum clue count for a standard unique-solution 9×9 Sudoku.

## Validation

```sh
npm test
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

JavaScript tests independently cross-check 36 random puzzles using the retained original engine, verify clue counts, replay solver placements/backtracks, and reject invalid boards. Python tests verify 30 generated boards, reproducible seeds and invalid inputs, then execute every notebook code cell in a fresh namespace and temporary directory and compare exported HTML with `index.html`. They do not need a Jupyter server.

Optional browser regression requires Playwright and Chromium. Start the static server, then run `npm run test:browser`; use `CHROMIUM_PATH` if Chromium is not at `/usr/bin/chromium`. The test checks real interactions, a full 17-clue player victory, 320/390px mobile layouts, and the iframe produced by executing the notebook. Screenshots are written to ignored `test-results/`.

The original main-branch `app.js` and `styles.css` remain for history but are not loaded by this page. `engine.js` remains as an independent test oracle, alongside its existing tests.
