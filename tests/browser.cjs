const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const path = require('node:path');
(async()=>{
  const root=path.resolve(__dirname,'..');fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
  execFileSync('python3',['tests/export_preview.py'],{cwd:root});
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage({viewport:{width:1366,height:1100}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const url=process.env.SUDOKU_URL||'http://127.0.0.1:3000/';
    await page.goto(url);await page.waitForSelector('.cell');
    const mode=await page.locator('body').getAttribute('class');
    const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sudoku-atelier-'+document.body.className+'-v1')));
    const fresh=async(level)=>{
      await page.locator('.level').nth(level).click();await page.locator('#new').click();
      if(await page.locator('#confirm-modal').isVisible())await page.locator('#confirm-new').click();
    };
    assert.equal(await page.locator('.cell').count(),81);assert.equal(await page.locator('.given').count(),40);
    await page.screenshot({path:path.join(root,'test-results/desktop.png'),fullPage:true});
    let state=await read();const index=state.puzzle.findIndex(n=>!n),correct=state.solution[index],wrong=correct===9?1:correct+1;
    await page.locator('.cell').nth(index).click();await page.locator('#notes').click();await page.keyboard.press(String(correct));
    assert.equal(await page.locator('.cell').nth(index).locator('.notes-grid').textContent(),String(correct));
    await page.keyboard.press(String(correct));assert.equal(await page.locator('.cell').nth(index).textContent(),'');
    await page.keyboard.press(String(correct));await page.locator('#notes').click();await page.keyboard.press(String(wrong));
    assert.equal(await page.locator('.cell').nth(index).getAttribute('aria-invalid'),'true');assert.match(await page.locator('#toast').textContent(),/Not quite/);
    await page.locator('#check').click();assert.match(await page.locator('#toast').textContent(),/another look/);
    await page.locator('#undo').click();assert.equal(await page.locator('.cell').nth(index).locator('.notes-grid').textContent(),String(correct));
    await page.keyboard.press(String(correct));await page.reload();
    assert.equal(await page.locator('.cell').nth(index).textContent(),String(correct));
    await page.locator('#pause').click();const timer=await page.locator('#timer').textContent();await page.waitForTimeout(1100);
    assert.equal(await page.locator('#timer').textContent(),timer);assert.equal(await page.locator('#pause-cover').isVisible(),true);
    await page.locator('#resume').click();
    await page.locator('#new').click();assert.equal(await page.locator('#confirm-modal').isVisible(),true);
    await page.locator('#confirm-modal [data-close]').last().click();assert.equal(await page.locator('.cell').nth(index).textContent(),String(correct));
    for(const [level,clues] of [40,32,25,22,19,17].entries()){await fresh(level);assert.equal(await page.locator('.given').count(),clues);}
    if(mode==='backtracking'){
      await fresh(0);const before=(await read()).values;
      await page.locator('#trace-step').click();assert.match(await page.locator('#trace-status').textContent(),/1 placements/);
      assert.equal(await page.locator('.trace-place').count(),1);assert.equal(await page.locator('#notes').isDisabled(),true);
      await page.locator('#trace-speed').selectOption('1');await page.locator('#trace-play').click();await page.waitForTimeout(100);await page.locator('#trace-play').click();
      assert.match(await page.locator('#trace-play').textContent(),/Watch/);
      await page.locator('#trace-speed').selectOption('250');await page.locator('#trace-play').click();
      await page.waitForFunction(()=>document.getElementById('trace-status').textContent.includes('Solution found by the algorithm'));
      assert.equal(await page.locator('#win-modal').isVisible(),false);
      await page.locator('#trace-reset').click();assert.deepEqual((await read()).values,before);
    }
    await fresh(5);state=await read();
    for(let i=0;i<81;i++)if(!state.puzzle[i]){await page.locator('.cell').nth(i).click();await page.keyboard.press(String(state.solution[i]));}
    assert.equal(await page.locator('#win-modal').isVisible(),true);assert.equal(await page.locator('#win-level').textContent(),'Dream');
    assert.match(await page.locator('#progress').textContent(),/64 of 64/);
    await page.screenshot({path:path.join(root,'test-results/win.png'),fullPage:true});
    await page.locator('#win-next').click();assert.equal(await page.locator('.given').count(),17);
    for(const width of [390,320]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:path.join(root,'test-results/mobile.png'),fullPage:true});
    state=await read();const mobileIndex=state.puzzle.findIndex(n=>!n);
    await page.locator('.cell').nth(mobileIndex).click();await page.locator('#notes').click();await page.getByRole('button',{name:'Enter 3',exact:true}).click();
    assert.equal(await page.locator('.cell').nth(mobileIndex).locator('.notes-grid').textContent(),'3');
    await page.locator('#erase').click();assert.equal(await page.locator('.cell').nth(mobileIndex).textContent(),'');
    await page.locator('#help').click();assert.equal(await page.locator('#help-modal').isVisible(),true);await page.keyboard.press('Escape');
    await page.goto(new URL('test-results/notebook-preview.html',url).href);
    const frame=page.frameLocator('iframe');await frame.locator('.cell').first().waitFor();
    assert.equal(await frame.locator('.cell').count(),81);
    await frame.locator('.cell:not(.given)').first().click();await frame.locator('#notes').click();await frame.getByRole('button',{name:'Enter 4',exact:true}).click();
    assert.equal(await frame.locator('.notes-grid').first().textContent(),'4');
    assert.deepEqual(errors,[]);
    console.log('PASS '+mode+': notes, errors, check, undo, storage, pause, new-game confirmation, six levels, player victory, mobile 320/390px, touch controls and executed notebook iframe'+(mode==='backtracking'?', solver step/play/pause/restore':'')+'.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
