const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3000');
 await page.waitForSelector('.cell');
 assert.equal(await page.locator('.cell').count(),81);
 await page.screenshot({path:'/tmp/sudoku-desktop.png',fullPage:true});
 const initial=await page.evaluate(()=>JSON.parse(localStorage.getItem('liubai-sudoku-v1')));
 const index=initial.puzzle.findIndex(n=>!n), correct=initial.solution[index], wrong=correct===9?1:correct+1;
 await page.locator('.cell').nth(index).click();
 await page.locator('#notes-button').click();
 await page.keyboard.press(String(correct));
 assert.equal(await page.locator('.cell').nth(index).locator('.notes').textContent(),String(correct));
 await page.keyboard.press(String(correct));
 assert.equal(await page.locator('.cell').nth(index).textContent(),'');
 await page.keyboard.press(String(correct));
 await page.locator('#notes-button').click();
 await page.keyboard.press(String(wrong));
 assert.equal(await page.locator('.cell').nth(index).getAttribute('aria-invalid'),'true');
 assert.match(await page.locator('#toast').textContent(),/填错/);
 await page.locator('#check-button').click();
 assert.match(await page.locator('#toast').textContent(),/1 个错误/);
 await page.locator('#undo-button').click();
 assert.equal(await page.locator('.cell').nth(index).locator('.notes').textContent(),String(correct));
 await page.keyboard.press(String(correct));
 assert.equal(await page.locator('.cell').nth(index).getAttribute('aria-invalid'),'false');
 await page.reload();
 assert.equal(await page.locator('.cell').nth(index).textContent(),String(correct));
 await page.locator('#pause-button').click();
 assert.equal(await page.locator('#pause-cover').isVisible(),true);
 const time=await page.locator('#timer').textContent(); await page.waitForTimeout(1100);
 assert.equal(await page.locator('#timer').textContent(),time);
 await page.locator('#resume-button').click();
 // A filled game is not replaced until confirmation.
 await page.getByRole('button',{name:'梦寐',exact:true}).click();
 await page.locator('#new-game').click();
 assert.equal(await page.locator('#confirm-dialog').isVisible(),true);
 await page.locator('#confirm-dialog [data-close]').last().click();
 assert.equal(await page.locator('#current-level').textContent(),'简单');
 await page.locator('#new-game').click(); await page.locator('#confirm-action').click();
 assert.equal(await page.locator('.given').count(),17);
 // Finish through normal UI inputs, exercising completion rather than calling a test hook.
 const expert=await page.evaluate(()=>JSON.parse(localStorage.getItem('liubai-sudoku-v1')));
 for(let i=0;i<81;i++) if(!expert.puzzle[i]) {await page.locator('.cell').nth(i).click();await page.keyboard.press(String(expert.solution[i]));}
 assert.equal(await page.locator('#win-dialog').isVisible(),true);
 assert.equal(await page.locator('#win-level').textContent(),'梦寐');
 assert.match(await page.locator('#filled-count').textContent(),/64 \/ 64/);
 await page.screenshot({path:'/tmp/sudoku-win.png',fullPage:true});
 await page.locator('#win-next').click();
 assert.equal(await page.locator('.given').count(),17);
 // All six difficulty controls produce the promised clue counts.
 for(const [level,count] of [['简单',40],['中等',32],['困难',25],['专家',22],['地狱',19],['梦寐',17]]) {
  await page.getByRole('button',{name:level,exact:true}).click();await page.locator('#new-game').click();
  assert.equal(await page.locator('.given').count(),count);
 }
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'/tmp/sudoku-mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const mobileIndex=await page.evaluate(()=>JSON.parse(localStorage.getItem('liubai-sudoku-v1')).puzzle.findIndex(n=>!n));
 await page.locator('.cell').nth(mobileIndex).click();await page.locator('#notes-button').click();
 await page.getByRole('button',{name:'输入数字 3',exact:true}).click();
 assert.equal(await page.locator('.cell').nth(mobileIndex).locator('.notes').textContent(),'3');
 await page.locator('#help-button').click();assert.equal(await page.locator('#help-dialog').isVisible(),true);
 await page.keyboard.press('Escape');
 assert.deepEqual(errors,[]);
 console.log('PASS: 81 cells, notes toggle, wrong answer warning, check, undo, reload persistence, pause, confirmation, 17-clue win, six difficulties, mobile notes, no overflow, help, no browser errors.');
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
