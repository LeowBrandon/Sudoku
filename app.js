(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const { LEVELS, generate, candidates } = Sudoku;
  const STORAGE = 'liubai-sudoku-v1';
  let game, selected = -1, nextLevel = 0, noteMode = false, paused = false;
  let toastTimeout, confirmCallback, lastTick = performance.now();
  const cells = [], numberKeys = [];
  function notify(message, error = false) {
    const toast = $('toast'); clearTimeout(toastTimeout);
    toast.textContent = message; toast.classList.toggle('error', error); toast.hidden = false;
    toastTimeout = setTimeout(() => { toast.hidden = true; }, error ? 4500 : 3000);
  }
  function save() {
    try { localStorage.setItem(STORAGE, JSON.stringify(game)); }
    catch { /* Storage can be unavailable in private or local-file contexts. */ }
  }
  function restore() {
    try {
      const g = JSON.parse(localStorage.getItem(STORAGE));
      if (!g || !LEVELS[g.level] || !Array.isArray(g.puzzle) || g.puzzle.length !== 81 ||
          !Array.isArray(g.values) || g.values.length !== 81 || !Array.isArray(g.solution) || g.solution.length !== 81 ||
          !Array.isArray(g.notes) || g.notes.length !== 81 || !Array.isArray(g.history) ||
          !Number.isFinite(g.elapsed) || g.elapsed < 0 || !Number.isInteger(g.mistakes) || g.mistakes < 0) return false;
      if ([...g.puzzle,...g.values,...g.solution].some(n => !Number.isInteger(n) || n < 0 || n > 9) || g.solution.some(n => !n)) return false;
      if (g.puzzle.filter(Boolean).length !== LEVELS[g.level].clues ||
          g.puzzle.some((n,i) => n && (n !== g.solution[i] || g.values[i] !== n)) ||
          g.notes.some(a => !Array.isArray(a) || a.some(n => !Number.isInteger(n) || n < 1 || n > 9))) return false;
      for (let i = 0; i < 81; i++) {
        const copy = g.solution.slice(); copy[i] = 0;
        if (!candidates(copy, i).includes(g.solution[i])) return false;
      }
      // Recompute completion instead of trusting a stored flag; discard stale undo records.
      g.history = []; g.won = g.values.every((n,i) => n === g.solution[i]);
      game = g; nextLevel = g.level; return true;
    } catch { return false; }
  }
  function formatTime(seconds) {
    const s = Math.floor(seconds), hours = Math.floor(s / 3600);
    return (hours ? String(hours).padStart(2,'0') + ':' : '') + String(Math.floor(s / 60) % 60).padStart(2,'0') + ':' + String(s % 60).padStart(2,'0');
  }
  function start(level) {
    const generated = generate(level);
    game = { ...generated, values: generated.puzzle.slice(), notes: Array.from({length:81}, () => []), elapsed:0, mistakes:0, history:[], won:false };
    nextLevel = level; selected = game.puzzle.findIndex(n => !n); noteMode = false; paused = false; lastTick = performance.now();
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
    $('confetti').replaceChildren(); save(); render();
  }
  function pushHistory() {
    game.history.push({ values:game.values.slice(), notes:game.notes.map(a => a.slice()) });
    if (game.history.length > 150) game.history.shift();
  }
  function related(a,b) {
    return Math.floor(a/9) === Math.floor(b/9) || a%9 === b%9 || (Math.floor(a/27) === Math.floor(b/27) && Math.floor(a%9/3) === Math.floor(b%9/3));
  }
  function canEdit() {
    if (paused || game.won) return false;
    if (selected < 0) { notify('先选择一个空格，再填入数字。'); return false; }
    if (game.puzzle[selected]) { notify('这是题目给定的数字，请选择空格。'); return false; }
    return true;
  }
  function enter(n) {
    if (!canEdit()) return;
    if (noteMode) {
      if (game.values[selected]) { notify('笔记只能写在空格中，请先擦除答案。'); return; }
      pushHistory();
      const notes = game.notes[selected];
      game.notes[selected] = notes.includes(n) ? notes.filter(v => v !== n) : [...notes,n].sort();
    } else {
      if (game.values[selected] === n) return;
      pushHistory(); game.values[selected] = n; game.notes[selected] = [];
      if (n !== game.solution[selected]) {
        game.mistakes++; notify(`第 ${Math.floor(selected/9)+1} 行第 ${selected%9+1} 列填错了，再想一想。`,true);
      } else {
        // Only a correct entry removes peer notes, so mistakes do not destroy reasoning.
        for (let i = 0; i < 81; i++) if (related(i,selected)) game.notes[i] = game.notes[i].filter(v => v !== n);
      }
    }
    save(); render();
    if (game.values.every((v,i) => v === game.solution[i])) win();
  }
  function erase() {
    if (!canEdit() || (!game.values[selected] && !game.notes[selected].length)) return;
    pushHistory(); game.values[selected] = 0; game.notes[selected] = []; save(); render();
  }
  function undo() {
    if (paused || game.won || !game.history.length) return;
    const previous = game.history.pop(); game.values = previous.values; game.notes = previous.notes; save(); render();
  }
  function toggleNotes() {
    if (paused || game.won) return;
    noteMode = !noteMode; render();
    notify(noteMode ? '笔记已开启：输入数字，标记或取消候选数。' : '笔记已关闭：现在输入正式答案。');
  }
  function chooseLevel(level) {
    nextLevel = level; renderDifficulty();
  }
  function renderDifficulty() {
    document.querySelectorAll('.difficulty-option').forEach((b,i) => {
      b.classList.toggle('active',i === nextLevel); b.setAttribute('aria-pressed',String(i === nextLevel));
    });
    $('level-label').textContent = LEVELS[nextLevel].label;
    $('level-description').textContent = LEVELS[nextLevel].description;
    $('level-symbol').textContent = ['✦','✧','◈','❖','♜','✺'][nextLevel];
  }
  function render() {
    const activeValue = selected >= 0 ? game.values[selected] : 0;
    cells.forEach((cell,i) => {
      const value = game.values[i], wrong = value && value !== game.solution[i];
      cell.classList.toggle('given',!!game.puzzle[i]);
      cell.classList.toggle('selected',selected === i);
      cell.classList.toggle('related',selected >= 0 && related(i,selected));
      cell.classList.toggle('same',!!activeValue && value === activeValue);
      cell.classList.toggle('wrong',!!wrong);
      cell.setAttribute('aria-selected',String(selected === i));
      cell.setAttribute('aria-invalid',String(!!wrong));
      cell.tabIndex = (selected === i || (selected < 0 && i === 0)) ? 0 : -1;
      cell.setAttribute('aria-label',`第${Math.floor(i/9)+1}行第${i%9+1}列，${value ? value + (game.puzzle[i] ? '，题目数字' : wrong ? '，答案错误' : '，已填写') : '空格' + (game.notes[i].length ? '，笔记' + game.notes[i].join('、') : '')}`);
      cell.replaceChildren();
      if (value) cell.textContent = value;
      else if (game.notes[i].length) {
        const notes = document.createElement('span'); notes.className = 'notes'; notes.setAttribute('aria-hidden','true');
        for (let n = 1; n <= 9; n++) { const span = document.createElement('span'); span.textContent = game.notes[i].includes(n) ? n : ''; notes.append(span); }
        cell.append(notes);
      }
    });
    const correct = game.values.filter((v,i) => !game.puzzle[i] && v === game.solution[i]).length;
    $('filled-count').textContent = `已完成 ${correct} / ${81 - LEVELS[game.level].clues}`;
    $('current-level').textContent = LEVELS[game.level].name;
    $('clue-tag').textContent = `${LEVELS[game.level].clues} 个线索`;
    $('timer').textContent = formatTime(game.elapsed);
    $('notes-button').setAttribute('aria-pressed',String(noteMode));
    $('note-status').textContent = noteMode ? '开' : '关';
    $('undo-button').disabled = !game.history.length || paused || game.won;
    $('erase-button').disabled = paused || game.won;
    $('notes-button').disabled = paused || game.won;
    $('check-button').disabled = paused || game.won;
    $('pause-button').disabled = game.won;
    $('pause-button').textContent = paused ? '▶' : 'Ⅱ';
    $('pause-button').setAttribute('aria-label',paused ? '继续游戏' : '暂停游戏');
    $('pause-button').title = paused ? '继续游戏' : '暂停游戏';
    $('pause-cover').hidden = !paused;
    $('board').inert = paused;
    $('board').setAttribute('aria-hidden',String(paused));
    numberKeys.forEach((key,i) => {
      const count = game.values.filter((v,j) => v === i+1 && v === game.solution[j]).length;
      key.querySelector('small').textContent = 9-count || '✓';
      key.classList.toggle('complete',count === 9); key.disabled = paused || game.won;
    });
    renderDifficulty();
  }
  function setPause(value) {
    if (game.won) return;
    paused = value; lastTick = performance.now(); render();
    if (paused) $('resume-button').focus(); else if (selected >= 0) cells[selected].focus();
    save();
  }
  function requestNewGame() {
    if (!game.won && game.values.some((v,i) => !game.puzzle[i] && (v || game.notes[i].length))) {
      $('confirm-title').textContent = `开启「${LEVELS[nextLevel].name}」新挑战？`;
      confirmCallback = () => start(nextLevel); $('confirm-dialog').showModal();
    } else start(nextLevel);
  }
  function win() {
    game.won = true; save(); render();
    $('win-level').textContent = LEVELS[game.level].name;
    $('win-time').textContent = formatTime(game.elapsed);
    $('win-mistakes').textContent = game.mistakes;
    $('win-dialog').showModal();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (let i = 0; i < 70; i++) {
        const piece = document.createElement('i'); piece.className = 'confetti-piece';
        piece.style.left = Math.random()*100+'%'; piece.style.background = ['#c4efbd','#edcb87','#f6f2d6','#77b5a5'][i%4];
        piece.style.animationDelay = Math.random()*.8+'s'; piece.style.setProperty('--drift',(Math.random()-.5)*300+'px');
        $('confetti').append(piece);
      }
      setTimeout(() => $('confetti').replaceChildren(),4500);
    }
  }
  for (let i = 0; i < 81; i++) {
    const cell = document.createElement('button'); cell.className = 'cell'; cell.type = 'button'; cell.setAttribute('role','gridcell');
    cell.addEventListener('click',() => { if (paused || game.won) return; selected = i; render(); });
    $('board').append(cell); cells.push(cell);
  }
  LEVELS.forEach((level,i) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'difficulty-option'; button.textContent = level.name;
    button.addEventListener('click',() => chooseLevel(i)); $('difficulty-options').append(button);
  });
  for (let n = 1; n <= 9; n++) {
    const key = document.createElement('button'); key.className = 'number-key'; key.setAttribute('aria-label',`输入数字 ${n}`);
    key.append(document.createTextNode(n)); key.append(document.createElement('small'));
    key.addEventListener('click',() => enter(n)); $('number-pad').append(key); numberKeys.push(key);
  }
  $('undo-button').addEventListener('click',undo);
  $('erase-button').addEventListener('click',erase);
  $('notes-button').addEventListener('click',toggleNotes);
  $('pause-button').addEventListener('click',() => setPause(!paused));
  $('resume-button').addEventListener('click',() => setPause(false));
  $('new-game').addEventListener('click',requestNewGame);
  $('win-next').addEventListener('click',() => start(nextLevel));
  $('help-button').addEventListener('click',() => $('help-dialog').showModal());
  $('confirm-action').addEventListener('click',() => { if (confirmCallback) confirmCallback(); });
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click',() => button.closest('dialog').close()));
  $('check-button').addEventListener('click',() => {
    const wrong = game.values.map((v,i) => v && v !== game.solution[i] ? i : -1).filter(i => i !== -1);
    if (wrong.length) { selected = wrong[0]; render(); cells[selected].focus(); notify(`发现 ${wrong.length} 个错误答案，已为你定位第一处。`,true); }
    else notify('目前填写的答案都正确，继续保持这份专注。');
  });
  document.addEventListener('keydown',event => {
    if (event.ctrlKey || event.metaKey) {
      if (event.key.toLowerCase() === 'z' && !document.querySelector('dialog[open]')) { event.preventDefault(); undo(); }
      return;
    }
    if (event.altKey || paused || game.won || document.querySelector('dialog[open]')) return;
    const key = event.key;
    if (/^[1-9]$/.test(key)) { event.preventDefault(); enter(Number(key)); }
    else if (key.toLowerCase() === 'n') { event.preventDefault(); toggleNotes(); }
    else if (key === 'Backspace' || key === 'Delete' || key === '0') { event.preventDefault(); erase(); }
    else if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(key)) {
      event.preventDefault(); if (selected < 0) selected = 0;
      else {
        const r = Math.floor(selected/9), c = selected%9;
        selected = (key === 'ArrowLeft' ? r*9+Math.max(0,c-1) : key === 'ArrowRight' ? r*9+Math.min(8,c+1) : key === 'ArrowUp' ? Math.max(0,r-1)*9+c : Math.min(8,r+1)*9+c);
      }
      render(); cells[selected].focus();
    }
  });
  document.addEventListener('visibilitychange',() => { if (document.hidden && !game.won) setPause(true); });
  window.addEventListener('pagehide',save);
  if (!restore()) start(0); else { selected = game.puzzle.findIndex(n => !n); render(); }
  setInterval(() => {
    const now = performance.now(), delta = (now-lastTick)/1000; lastTick = now;
    if (!paused && !game.won && !document.hidden && !document.querySelector('dialog[open]')) {
      game.elapsed += delta; $('timer').textContent = formatTime(game.elapsed); save();
    }
  },1000);
})();
