'use strict';
/* ===== 資料（只儲喺呢部機嘅瀏覽器 localStorage） ===== */
const KEY = 'gym-log-v1';
const emptyDB = () => ({ version: 1, sessions: [] });
let db = load();
function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && Array.isArray(d.sessions)) return d; }
  catch (e) { console.warn('讀取資料失敗', e); }
  return emptyDB();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('儲存失敗：瀏覽器空間可能唔夠'); } }
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ===== 工具 ===== */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localDT = d => `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const todayKey = () => dayKey(new Date());
const WD = ['日', '一', '二', '三', '四', '五', '六'];
function dayLabel(key) {
  const d = new Date(key + 'T00:00'), base = `${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）`;
  if (key === todayKey()) return '今日 · ' + base;
  if (key === dayKey(new Date(Date.now() - 864e5))) return '琴日 · ' + base;
  return base;
}
const fmtNum = n => Math.round(n).toLocaleString('en-US');
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2200); }

const FOCUS = ['胸', '背', '腿', '肩', '手臂', '核心', '全身'];
const COMMON_EX = ['深蹲', '硬拉', '臥推', '上斜臥推', '肩推', '划船', '引體上升', '滑輪下拉', '腿推', '羅馬尼亞硬拉', '二頭彎舉', '三頭下壓', '側平舉', '臀推', '弓步', '平板支撐'];
const setsOf = s => s.exercises.reduce((a, e) => a + e.sets.length, 0);
const volOf = s => s.exercises.reduce((a, e) => a + e.sets.reduce((b, x) => b + (+x.reps || 0) * (+x.kg || 0), 0), 0);

/* ===== 主畫面 ===== */
function weekStart() { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; } // 星期一開始
function render() {
  const now = new Date();
  $('#todayDate').textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${WD[now.getDay()]}`;
  const ws = dayKey(weekStart());
  const week = db.sessions.filter(s => s.time.slice(0, 10) >= ws);
  $('#wSessions').textContent = week.length;
  $('#wSets').textContent = week.reduce((a, s) => a + setsOf(s), 0);
  $('#wVol').textContent = fmtNum(week.reduce((a, s) => a + volOf(s), 0));
  const keys = []; for (let i = 6; i >= 0; i--) keys.push(dayKey(new Date(Date.now() - i * 864e5)));
  barChart($('#chartVol'), keys, keys.map(k => db.sessions.filter(s => s.time.slice(0, 10) === k).reduce((a, s) => a + volOf(s), 0)));
  const groups = {};
  db.sessions.forEach(s => (groups[s.time.slice(0, 10)] ||= []).push(s));
  const days = Object.keys(groups).sort().reverse();
  $('#sessionList').innerHTML = days.length ? days.map(k => `<div class="day-group"><div class="day-head"><b>${esc(dayLabel(k))}</b></div><div class="list">${
    groups[k].sort((a, b) => b.time.localeCompare(a.time)).map(sessionItem).join('')}</div></div>`).join('')
    : `<div class="empty">未有訓練記錄<br>撳下面「＋ 新訓練」開始記錄第一次訓練 💪</div>`;
}
function sessionItem(s) {
  const names = s.exercises.map(e => e.name).join('、');
  return `<div class="item" data-id="${s.id}"><div class="emoji">🏋️</div>
    <div class="main"><div class="t1">${s.time.slice(11, 16)}${s.focus ? `<span class="tag">${esc(s.focus)}</span>` : ''} ${esc(names)}</div>
    <div class="t2">${s.exercises.length} 個動作 · ${setsOf(s)} 組${s.notes ? ' · ' + esc(s.notes) : ''}</div></div>
    <div class="right">${fmtNum(volOf(s))}<small>kg</small></div></div>`;
}
function barChart(el, keys, values) {
  const W = 320, H = 150, top = 18, bottom = 24, bw = (W - 12) / keys.length;
  const max = Math.max(...values, 1) * 1.1;
  let s = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="近 7 日訓練量">`;
  keys.forEach((k, i) => {
    const v = values[i], h = (H - top - bottom) * (v / max), x = 6 + i * bw + bw * 0.2, y = H - bottom - h, isT = k === todayKey();
    s += `<rect x="${x}" y="${y}" width="${bw * 0.6}" height="${v ? Math.max(h, 2) : 0}" rx="4" fill="#10b981" opacity="${isT ? 1 : .55}"/>`;
    if (v) s += `<text class="val" x="${x + bw * 0.3}" y="${y - 4}" text-anchor="middle">${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v)}</text>`;
    s += `<text x="${x + bw * 0.3}" y="${H - 8}" text-anchor="middle">${isT ? '今日' : WD[new Date(k + 'T00:00').getDay()]}</text>`;
  });
  el.innerHTML = s + '</svg>';
}
document.addEventListener('click', e => { const it = e.target.closest('#sessionList .item'); if (it) viewSession(it.dataset.id); });

/* ===== 彈出視窗 ===== */
function openSheet(title, html, onReady) {
  $('#sheetTitle').textContent = title; $('#sheetBody').innerHTML = html; $('#sheet').hidden = false;
  document.body.style.overflow = 'hidden'; $('.sheet').scrollTop = 0;
  if (onReady) onReady($('#sheetBody'));
}
function closeSheet() { $('#sheet').hidden = true; document.body.style.overflow = ''; }
$('#sheetClose').addEventListener('click', closeSheet);
$('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });

/* --- 睇訓練 --- */
function viewSession(id) {
  const s = db.sessions.find(x => x.id === id); if (!s) return;
  openSheet(`${dayLabel(s.time.slice(0, 10))} ${s.time.slice(11, 16)}`, `
    <div class="kv"><div><b>${s.exercises.length}</b><small>動作</small></div><div><b>${setsOf(s)}</b><small>組</small></div><div><b>${fmtNum(volOf(s))}</b><small>訓練量 kg</small></div></div>
    ${s.focus ? `<p>重點：<span class="tag">${esc(s.focus)}</span></p>` : ''}
    ${s.exercises.map(e => `<div class="detail-ex"><h3>${esc(e.name)}</h3><div class="sets">${e.sets.map((x, i) =>
      `第 ${i + 1} 組：${x.kg !== '' && x.kg != null ? `${+x.kg} kg × ` : ''}${+x.reps || 0} 次`).join('<br>')}</div></div>`).join('')}
    ${s.notes ? `<div class="notes">${esc(s.notes)}</div>` : ''}
    <div class="form"><div class="actions"><button class="btn danger" id="del">刪除</button><button class="btn" id="edit">修改</button></div></div>`, root => {
    root.querySelector('#edit').addEventListener('click', () => sessionForm(s));
    root.querySelector('#del').addEventListener('click', () => {
      if (!confirm('確定刪除呢次訓練？')) return;
      db.sessions = db.sessions.filter(x => x.id !== s.id); save(); closeSheet(); render(); toast('已刪除');
    });
  });
}

/* --- 新增／修改訓練 --- */
function setRow(i, st) {
  return `<div class="set-row"><div class="no">${i + 1}</div>
    <input type="number" inputmode="numeric" min="0" step="1" class="reps" value="${esc(st.reps)}" placeholder="次數" aria-label="次數">
    <input type="number" inputmode="decimal" min="0" step="0.5" class="kg" value="${esc(st.kg)}" placeholder="kg" aria-label="重量 kg">
    <button type="button" class="x-btn del-set" aria-label="刪除呢組">✕</button></div>`;
}
function exBlock(e) {
  const sets = e.sets.length ? e.sets : [{ reps: '', kg: '' }];
  return `<div class="ex"><div class="ex-head"><input class="ex-name" list="exNames" value="${esc(e.name)}" placeholder="動作名稱，例如：深蹲" aria-label="動作名稱">
    <button type="button" class="x-btn del-ex" aria-label="刪除動作">🗑</button></div>
    <div class="set-head"><span>組</span><span>次數</span><span>重量 kg</span><span></span></div>
    <div class="sets">${sets.map((s, i) => setRow(i, s)).join('')}</div>
    <div class="ex-btns"><button type="button" class="btn copy-set">📋 複製上一組</button><button type="button" class="btn ghost add-set">＋ 加一組</button></div></div>`;
}
function renumber(ex) { ex.querySelectorAll('.set-row .no').forEach((n, i) => n.textContent = i + 1); }
function sessionForm(s) {
  const d = s || { time: localDT(new Date()), focus: '', exercises: [{ name: '', sets: [] }], notes: '' };
  const names = [...new Set([...db.sessions.flatMap(x => x.exercises.map(e => e.name)), ...COMMON_EX])];
  openSheet(s ? '修改訓練' : '新訓練', `<form class="form" id="f" novalidate>
    <label>日期時間</label><input type="datetime-local" name="time" value="${d.time}" required>
    <label>重點（可選）</label><div class="seg" id="focus">${FOCUS.map(o => `<button type="button" data-v="${o}" class="${o === d.focus ? 'on' : ''}">${o}</button>`).join('')}</div>
    <label>動作</label><div id="exList">${d.exercises.map(exBlock).join('')}</div>
    <datalist id="exNames">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
    <button type="button" class="btn ghost block" id="addEx" style="margin-top:10px">＋ 加動作</button>
    <label>備註</label><textarea name="notes" placeholder="例如：今日狀態好、膊頭有少少痛">${esc(d.notes)}</textarea>
    <div class="err" id="err"></div>
    <div class="actions"><button type="button" class="btn ghost" id="cancel">取消</button><button class="btn primary">儲存</button></div></form>`, root => {
    const f = root.querySelector('#f'), list = root.querySelector('#exList');
    root.querySelector('#focus').addEventListener('click', e => { // 再撳一次就取消
      const b = e.target.closest('button'); if (!b) return;
      const on = !b.classList.contains('on'); root.querySelectorAll('#focus button').forEach(x => x.classList.remove('on')); b.classList.toggle('on', on);
    });
    root.querySelector('#addEx').addEventListener('click', () => {
      list.insertAdjacentHTML('beforeend', exBlock({ name: '', sets: [] })); list.lastElementChild.querySelector('.ex-name').focus();
    });
    list.addEventListener('click', e => {
      const ex = e.target.closest('.ex'); if (!ex) return;
      const sets = ex.querySelector('.sets');
      if (e.target.closest('.add-set')) { sets.insertAdjacentHTML('beforeend', setRow(sets.children.length, { reps: '', kg: '' })); sets.lastElementChild.querySelector('.reps').focus(); }
      else if (e.target.closest('.copy-set')) {
        const last = sets.lastElementChild;
        const st = last ? { reps: last.querySelector('.reps').value, kg: last.querySelector('.kg').value } : { reps: '', kg: '' };
        sets.insertAdjacentHTML('beforeend', setRow(sets.children.length, st));
      }
      else if (e.target.closest('.del-set')) { e.target.closest('.set-row').remove(); renumber(ex); }
      else if (e.target.closest('.del-ex')) { if (list.children.length > 1 || confirm('刪除呢個動作？')) ex.remove(); }
    });
    root.querySelector('#cancel').addEventListener('click', () => s ? viewSession(s.id) : closeSheet());
    f.addEventListener('submit', e => {
      e.preventDefault();
      const err = root.querySelector('#err');
      if (!f.time.value) return err.textContent = '請揀日期時間';
      const exercises = [...list.querySelectorAll('.ex')].map(ex => ({
        name: ex.querySelector('.ex-name').value.trim(),
        sets: [...ex.querySelectorAll('.set-row')].map(r => ({ reps: r.querySelector('.reps').value === '' ? '' : Math.max(0, +r.querySelector('.reps').value),
          kg: r.querySelector('.kg').value === '' ? '' : Math.max(0, +r.querySelector('.kg').value) })).filter(x => x.reps !== '' || x.kg !== '')
      })).filter(ex => ex.name || ex.sets.length);
      if (!exercises.length) return err.textContent = '最少要有一個動作';
      if (exercises.some(ex => !ex.name)) return err.textContent = '有動作未填名稱';
      const rec = { id: s?.id || uid(), time: f.time.value, focus: root.querySelector('#focus .on')?.dataset.v || '', exercises, notes: f.notes.value.trim() };
      if (s) Object.assign(s, rec); else db.sessions.push(rec);
      save(); render(); toast('已儲存訓練'); viewSession(rec.id);
    });
  });
}
$('#addBtn').addEventListener('click', () => sessionForm());

/* ===== 設定／備份 ===== */
$('#settingsBtn').addEventListener('click', () => {
  openSheet('設定同備份', `<div class="form settings">
    <p>所有資料只係儲喺呢部機嘅瀏覽器入面（共 ${db.sessions.length} 次訓練），唔會上載。iPhone 同 Mac 唔會自動同步，可以用匯出／匯入搬資料，亦建議定期匯出備份。</p>
    <div class="actions"><button class="btn" id="exp">⬇️ 匯出 JSON</button><button class="btn" id="imp">⬆️ 匯入 JSON</button></div>
    <input type="file" id="file" accept="application/json,.json" hidden>
    <div class="actions"><button class="btn ghost" id="wipe" style="color:var(--red)">清除所有資料</button></div>
    <p class="hint">Gym 記錄 v1.0</p></div>`, root => {
    root.querySelector('#exp').addEventListener('click', exportData);
    root.querySelector('#imp').addEventListener('click', () => root.querySelector('#file').click());
    root.querySelector('#file').addEventListener('change', e => e.target.files[0] && importData(e.target.files[0]));
    root.querySelector('#wipe').addEventListener('click', () => {
      if (!confirm('確定清除所有訓練記錄？呢個動作冇得還原（建議先匯出備份）。')) return;
      db = emptyDB(); save(); closeSheet(); render(); toast('已清除所有資料');
    });
  });
});
function exportData() {
  const blob = new Blob([JSON.stringify({ app: 'gym-log', exportedAt: new Date().toISOString(), ...db }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `gym記錄備份-${todayKey()}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast('已匯出備份檔');
}
function importData(file) {
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const d = JSON.parse(fr.result);
      if (!d || !Array.isArray(d.sessions) || d.sessions.some(s => !s.id || !s.time || !Array.isArray(s.exercises))) throw new Error('格式唔啱');
      if (confirm('撳「確定」= 合併入現有資料\n撳「取消」= 用備份完全取代現有資料')) {
        const ids = new Set(db.sessions.map(s => s.id)); d.sessions.forEach(s => { if (!ids.has(s.id)) db.sessions.push(s); });
      } else db = { version: 1, sessions: d.sessions };
      save(); closeSheet(); render(); toast('匯入成功');
    } catch (e) { alert('匯入失敗：' + e.message); }
  };
  fr.readAsText(file);
}

/* ===== 啟動 ===== */
render();
let lastDay = todayKey();
setInterval(() => { if (todayKey() !== lastDay) { lastDay = todayKey(); render(); } }, 60000);
if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
  navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW 註冊失敗', e));
}
