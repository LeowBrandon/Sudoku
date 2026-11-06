"""Execute the notebook in a disposable output directory and write its iframe for browser tests."""
import contextlib
import io
import json
import os
from pathlib import Path

root = Path(__file__).resolve().parents[1]
output = root / 'test-results'
output.mkdir(exist_ok=True)
namespace = {'__name__': '__main__'}
notebook = json.loads(next((root / 'notebooks').glob('*.ipynb')).read_text())
os.chdir(output)
with contextlib.redirect_stdout(io.StringIO()):
    for cell in notebook['cells']:
        if cell['cell_type'] == 'code':
            exec(''.join(cell['source']), namespace)
(output / 'notebook-preview.html').write_text('<!DOCTYPE html><meta charset="UTF-8">' + namespace['iframe_markup'])
print('Executed all notebook code cells and exported browser preview.')
