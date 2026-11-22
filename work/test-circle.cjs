const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url'),{spawn}=require('child_process'),assert=require('node:assert/strict');
const proc=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--disable-gpu','--disable-background-networking','--no-first-run','--remote-debugging-pipe','--user-data-dir='+path.resolve('work/circle-check-'+Date.now()),'about:blank'],{stdio:['ignore','ignore','ignore','pipe','pipe'],windowsHide:true});
const pending=new Map();let buf='',id=0;proc.stdio[4].on('data',d=>{buf+=d;let i;while((i=buf.indexOf('\0'))>=0){let m=JSON.parse(buf.slice(0,i));buf=buf.slice(i+1);if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id)}}});
function send(method,params={},sessionId){let n=++id;return new Promise(r=>{pending.set(n,r);proc.stdio[3].write(JSON.stringify({method,params,sessionId,id:n})+'\0')})}
let timeout=setTimeout(()=>{console.error('browser test timed out');proc.kill();process.exit(1)},85000);
(async()=>{let target=(await send('Target.createTarget',{url:pathToFileURL(path.resolve('outputs/주문의 갈림길.html')).href})).result.targetId;
let sid=(await send('Target.attachToTarget',{targetId:target,flatten:true})).result.sessionId;
async function run(expression){let m=await send('Runtime.evaluate',{expression,returnByValue:true},sid);if(m.result.exceptionDetails)throw Error(JSON.stringify(m.result.exceptionDetails));return m.result.result.value}
for(let i=0;i<40&&await run('typeof input')!=='function';i++)await new Promise(r=>setTimeout(r,90));
async function wait(q){for(let i=0;i<400;i++){if(await run(q))return;await new Promise(r=>setTimeout(r,60))}throw Error(q)}
async function press(s){for(const v of s)await run("document.querySelector('#examKeys').children["+String(+v-1)+"].click()")}
await send('Emulation.setDeviceMetricsOverride',{width:Number(process.argv[2]),height:850,deviceScaleFactor:1,mobile:false},sid);
async function snap(n){const r=await send('Page.captureScreenshot',{format:'png'},sid);fs.writeFileSync('work/'+n+'-'+process.argv[2]+'.png',Buffer.from(r.result.data,'base64'))}
assert(await run("el('enterExam').disabled&&el('circleRank').textContent==='2서클'"));
assert(await run("el('keys').children.length===4&&el('wavePage').hidden"));
await run("input('5');input('6');input('9')");
assert(await run("!seq&&!shots.some(s=>s.type==='wave')"));
async function clearBoss(path){
 const result=await run(`(()=>{reset();offerRoute();el('${path==='battery'?'chooseBattery':'chooseGallery'}').click();
 travel=gateStop;waves=[];foes=[];tick(.02);
 for(let i=0;i<2;i++){lanceReady=time;input('2');input('1');for(let n=0;n<90&&!shots.every(s=>s.type!=='lance');n++)tick(.016)}
 return gatekeeper.hp===0&&gateOpenedAt!==null})()`);assert(result)
}
await clearBoss('battery');await clearBoss('battery');assert(await run("circleMarks.size===1&&el('enterExam').disabled"));
await send('Page.reload',{},sid);await wait("typeof circleMarks!=='undefined'&&circleMarks.has('battery')&&gatekeeper===null");
await clearBoss('gallery');assert(await run("!el('enterExam').disabled&&el('circleRank').textContent==='2서클'"));
await run("el('enterExam').click()");await press('4');assert(await run("examStep===0&&examPrefix===''"));
await press('3');await run("el('exitExam').click()");await wait("state==='run'");
await run("el('enterExam').click()");assert(await run("examPrefix===''&&examStep===0"));await press('343121');
assert(await run("examStep===3&&el('circleRank').textContent==='3서클'"));
await run("el('exitExam').click()");await wait("state==='run'");await send('Page.reload',{},sid);
await wait("typeof circleMarks!=='undefined'&&circleMarks.has('third')&&gatekeeper===null");
assert(await run("el('enterExam').disabled&&circleMarks.size===3"));
assert(await run("el('keys').textContent==='125346789'&&!el('wavePage').hidden"));
assert(await run(`(()=>{
 reset();if(foes.length!==3)return false;
 for(const digit of '569')input(digit);
 for(let i=0;i<85;i++)tick(.016);
 return runMastery.wave===1
})()`));
assert(await run(`(()=>{
 reset();for(let i=0;i<202;i++)tick(.016);
 if(!foes.every(f=>foeY(f)===215))return false;
 for(const digit of '569')[...el('keys').children].find(b=>b.textContent===digit).click();
 for(let i=0;i<69;i++)tick(.016);
 const marks=waveTrails[0].marks;
 const labels=[],paint=c.fillText;
 c.fillText=function(label,...args){labels.push(label);paint.call(c,label,...args)};
 try{draw(1)}finally{c.fillText=paint}
 return marks.length===3&&marks.every((m,i)=>m.foe===foes[i]&&m.foe.hp===1&&(!i||m.at>marks[i-1].at))
  &&runMastery.wave===3&&labels.includes('3기 관통')&&['1','2','3'].every(n=>labels.includes(n))
})()`));
await run('reset()');
console.log('Promoted opener: early cast hit one, aligned cast hit all three in sequence; numbered hits and three-hit caption drawn');
await run("foes=[guard(55),guard(115)];for(const n of '56')[...el('keys').children].find(b=>b.textContent===n).click()");
await send('Input.dispatchKeyEvent',{type:'keyDown',key:'9',code:'Digit9'},sid);
await send('Input.dispatchKeyEvent',{type:'keyUp',key:'9',code:'Digit9'},sid);
assert(await run("cast?.spell==='wave'&&waveReady>time"));
await run("for(let i=0;i<49;i++)tick(.016);draw(1)");
assert(await run("foes.every(f=>f.hp===1)&&runMastery.wave===2"));
await run("for(const n of '569')input(n)");
assert(await run("queuedSpell==='wave'"));
console.log('3x3 unlock, restored layout, mixed click/keyboard casting, two targets, mastery and queue verified');
console.log('Duplicate clears, cross-reload unlock, wrong answer, exam exit/re-entry, promotion and save verified')
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{clearTimeout(timeout);await send('Browser.close')});






