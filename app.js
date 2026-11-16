'use strict';
const KEY='savings-note-v1';
const defaults=()=>({version:1,opening:10000,target:40000,stashEstimate:5000,entries:[]});
const $=id=>document.getElementById(id),yen=n=>Math.round(n).toLocaleString('ja-JP')+'円';
const localDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today=()=>localDate(new Date());
const parseDate=s=>new Date(s+'T12:00:00');
let state = defaults();
let lastRaw = null;
let recovery = false;
let startupError = '';
try {
  lastRaw = localStorage.getItem(KEY);
  if (lastRaw !== null) {
    const data = JSON.parse(lastRaw);
    if (!validate(data)) throw new Error('保存データの形式が不正です');
    state = data;
  }
} catch (err) {
  recovery = true;
  startupError = err.message;
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = parseDate(value);
  return !Number.isNaN(d.getTime()) && localDate(d) === value;
}
function validate(d) {
  if (!d || d.version !== 1 || !Number.isSafeInteger(d.opening) || d.opening < 0 ||
      !Number.isSafeInteger(d.target) || d.target <= 0 || !Number.isSafeInteger(d.stashEstimate) ||
      d.stashEstimate < 0 || d.stashEstimate > 10000 || !Array.isArray(d.entries) || d.entries.length >= 100000) return false;
  const ids = new Set();
  let total = d.opening;
  let expenses = 0;
  return d.entries.every(e => {
    if (!e || typeof e.id !== 'string' || !e.id || ids.has(e.id) ||
        !['expense','saving','stash','adjust'].includes(e.kind) || !Number.isSafeInteger(e.amount) ||
        e.amount <= 0 || e.amount > 100000000 || (e.kind === 'stash' && e.amount > 10000) ||
        !validDate(e.date) || typeof e.memo !== 'string' || e.memo.length > 100) return false;
    ids.add(e.id);
    total += e.kind === 'saving' || e.kind === 'stash' ? e.amount : e.kind === 'adjust' ? -e.amount : 0;
    if (e.kind === 'expense') expenses += e.amount;
    return Number.isSafeInteger(total) && Number.isSafeInteger(expenses);
  });
}
function save(next, allowRecovery = false) {
  try {
    if (recovery && !allowRecovery) throw new Error('保存データを確認できません。先にバックアップを復元してください');
    if (!validate(next)) throw new Error('金額・日付・記録数などのデータ形式が不正です');
    const current = localStorage.getItem(KEY);
    if (current !== lastRaw) throw new Error('別の画面でデータが変更されました。この画面を再読み込みしてから操作してください');
    const json = JSON.stringify(next);
    localStorage.setItem(KEY, json);
    if (localStorage.getItem(KEY) !== json) throw new Error('保存内容を確認できません。再読み込みして確認してください');
    state = next;
    lastRaw = json;
    recovery = false;
    status('保存済み · ' + new Date().toLocaleTimeString('ja-JP'));
    return true;
  } catch (err) {
    status('保存未完了：' + err.message);
    alert('保存できませんでした：' + err.message);
    return false;
  }
}
function status(message) { $('saveStatus').textContent = message; }
function balance(){return state.opening+state.entries.filter(e=>e.date<=today()).reduce((n,e)=>n+(e.kind==='saving'||e.kind==='stash'?e.amount:e.kind==='adjust'?-e.amount:0),0)}
function weekStart(d){const a=new Date(d);a.setHours(12,0,0,0);a.setDate(a.getDate()-((a.getDay()+6)%7));return a}
function spentThisWeek(){const start=localDate(weekStart(new Date())),end=new Date(parseDate(start));end.setDate(end.getDate()+7);const limit=localDate(end);return state.entries.filter(e=>e.kind==='expense'&&e.date<=today()&&e.date>=start&&e.date<limit&&[1,2,3,4,5].includes(parseDate(e.date).getDay())).reduce((n,e)=>n+e.amount,0)}
function forecast(){let b=balance();if(b>=state.target)return '目標達成！';const start=new Date();start.setHours(12,0,0,0);const recorded=new Set(state.entries.filter(e=>e.kind==='saving').map(e=>e.date));for(let i=0;i<3650;i++){const d=new Date(start);d.setDate(d.getDate()+i);const ds=localDate(d);if(d.getDay()===1&&!recorded.has(ds))b+=1000;if(d.getDate()===27&&!state.entries.some(e=>e.kind==='stash'&&e.date===ds))b+=state.stashEstimate;if(b>=state.target)return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日頃`;}return '10年以内の達成予測なし'}
function render(){const b=balance(),p=Math.min(100,Math.max(0,b/state.target*100)),spent=spentThisWeek();$('balance').textContent=yen(b);$('targetLabel').textContent='目標 '+yen(state.target);$('percent').textContent=Math.round(p)+'%';$('progress').style.width=p+'%';$('remaining').textContent=b>=state.target?'目標達成！':'あと '+yen(state.target-b);$('weekSpent').textContent=yen(spent);$('weekLeft').textContent=yen(2000-spent);$('weekLeft').style.color=spent>2000?'#ffb5a6':'';$('forecast').textContent=forecast();$('count').textContent=state.entries.length+'件';$('history').replaceChildren();const names={expense:'支出',saving:'毎週の積立',stash:'へそくり',adjust:'貯金の取り崩し'};for(const e of [...state.entries].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,100)){const row=document.createElement('div');row.className='row';const left=document.createElement('div');const strong=document.createElement('strong');strong.textContent=e.memo||names[e.kind];const small=document.createElement('small');small.textContent=e.date+' · '+names[e.kind];left.append(strong,small);const right=document.createElement('div');right.style.textAlign='right';const value=document.createElement('span');value.textContent=(e.kind==='saving'||e.kind==='stash'?'+':'−')+yen(e.amount);value.style.color=e.kind==='saving'||e.kind==='stash'?'#8ee3b5':'';const del=document.createElement('button');del.className='secondary';del.textContent='削除';del.style.marginLeft='8px';del.addEventListener('click',()=>{if(confirm('この記録を削除しますか？')){if(save({...state,entries:state.entries.filter(x=>x.id!==e.id)}))render()}});right.append(value,del);row.append(left,right);$('history').append(row)}if(!state.entries.length){const empty=document.createElement('p');empty.className='hint';empty.textContent='まだ記録がありません。';$('history').append(empty)}}
function add(kind,amount,date,memo){if(!Number.isSafeInteger(amount)||amount<=0||amount>100000000||!validDate(date)||date>today()){alert('正しい金額と実在する日付（今日以前）を入力してください。');return}if(kind==='stash'&&amount>10000){alert('へそくりは1回10,000円以内で入力してください。');return}const entry={id:globalThis.crypto?.randomUUID?.()||String(Date.now())+'-'+Math.random(),kind,amount,date,memo:memo.slice(0,100)};if(save({...state,entries:[...state.entries,entry]})){render();$('amount').value='';$('memo').value=''}}
$('date').value=today();$('target').value=state.target;$('opening').value=state.opening;$('stashEstimate').value=state.stashEstimate;
$('add').onclick=()=>add($('kind').value,Number($('amount').value),$('date').value,$('memo').value);
$('quick').onclick=()=>{if(confirm('本日1,000円を積み立てた記録を追加しますか？'))add('saving',1000,today(),'毎週の積立')};
$('stashEstimate').onchange=()=>{const n=Number($('stashEstimate').value);if(Number.isSafeInteger(n)&&n>=0&&n<=10000){if(save({...state,stashEstimate:n}))render();else $('stashEstimate').value=state.stashEstimate}else{$('stashEstimate').value=state.stashEstimate;alert('0〜10,000円で入力してください。')}};
$('saveSettings').onclick=()=>{const target=Number($('target').value),opening=Number($('opening').value);if(!Number.isSafeInteger(target)||target<=0||!Number.isSafeInteger(opening)||opening<0){alert('設定値を確認してください。');return}if(save({...state,target,opening})){render();alert('設定を保存しました。')}};
$('export').onclick=()=>{const blob=new Blob([recovery ? (lastRaw ?? '') : JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='savings-backup-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('importButton').onclick=()=>$('importFile').click();$('importFile').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>10000000)throw Error('ファイルが大きすぎます');const data=JSON.parse(await file.text());if(!validate(data))throw Error('バックアップ形式が正しくありません');if(confirm('現在の記録をバックアップの内容で置き換えますか？')){if(save(data,true)){render();$('target').value=state.target;$('opening').value=state.opening;$('stashEstimate').value=state.stashEstimate;alert('復元しました')}}}catch(err){alert('復元できません: '+err.message)}finally{e.target.value=''}};
$('reset').onclick=()=>{if(confirm('すべての記録と設定を削除しますか？')&&confirm('この操作は取り消せません。バックアップを保存しましたか？')){if(save(defaults(),true)){render();$('target').value=state.target;$('opening').value=state.opening;$('stashEstimate').value=state.stashEstimate}}};
function refresh() {
  if (recovery) {
    for (const id of ['balance','weekSpent','weekLeft','remaining','percent','forecast']) $(id).textContent = '読込不可';
    $('progress').style.width = '0%';
    $('history').replaceChildren();
    status('保存データを読み込めません：' + startupError + '。バックアップ保存で元データを退避し、バックアップ復元を行ってください。');
  } else render();
}
refresh();
if (!recovery) status(lastRaw === null ? '記録はまだ保存されていません' : '保存データを読み込みました');
let visibleDate = today();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (today() !== visibleDate) { visibleDate = today(); $('date').value = visibleDate; }
  refresh();
});
window.addEventListener('storage', e => {
  if (e.key === KEY || e.key === null) status('別の画面で保存内容が変更されました。再読み込みしてください。');
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').then(reg => {
  reg.update().catch(() => {});
}).catch(() => status('オフライン機能の準備に失敗しました。記録の保存状態とは別です。'));

