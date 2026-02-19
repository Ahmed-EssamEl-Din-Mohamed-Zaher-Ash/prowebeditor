// ============== DEFAULT CODE SAMPLES ==============
const defaultHTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>

    <script src="script.js"><\/script>
</body>
</html>`;

const defaultCSS = `/* Style Here */`;

const defaultJS = `console.log("اهلا بالعالم");`;
// ============== EDITOR INITIALIZATION ==============
const editorConfig = {
  lineNumbers: true,
  theme: 'material-darker',
  autoCloseTags: true,
  autoCloseBrackets: true,
  matchTags: { bothTags: true },
  matchBrackets: true,
  foldGutter: true,
  gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
  lineWrapping: true,
  styleActiveLine: true,
  extraKeys: {
    'Ctrl-Space': 'autocomplete',
    'Ctrl-/': 'toggleComment',
    'Ctrl-S': function(cm) { runPreview(); showNotification('تم الحفظ والتحديث', 'success'); },
    'F11': function() { toggleZenMode(); }
  },
  highlightSelectionMatches: { showToken: true, annotateScrollbar: true },
  keyMap: 'sublime'
};

const editors = {};
editors.html = CodeMirror.fromTextArea(document.getElementById('editor-html'), { ...editorConfig, mode: 'htmlmixed' });
editors.css  = CodeMirror.fromTextArea(document.getElementById('editor-css'),  { ...editorConfig, mode: 'css' });
editors.js   = CodeMirror.fromTextArea(document.getElementById('editor-js'),   { ...editorConfig, mode: 'javascript' });

editors.html.setValue(defaultHTML);
editors.css.setValue(defaultCSS);
editors.js.setValue(defaultJS);

let activeTab = 'html';
let previewVisible = true;
let zenMode = false;
let visualScoping = false;
let domMapping = false;
let cogMeterActive = true;
let stressDetectionActive = true;
let currentPanel = 'explorer';

// ============== TYPING / STRESS MONITORING ==============
const monitor = {
  keystrokes: 0, errors: 0, startTime: null, words: 0,
  wpmHistory: [], stressHistory: [], lastKeyTime: 0,
  recentSpeeds: [], typingSeconds: 0, timerInterval: null, stressLevel: 0
};

function startTypingTimer() {
  if (!monitor.timerInterval) {
    monitor.startTime = Date.now();
    monitor.timerInterval = setInterval(() => {
      monitor.typingSeconds++;
      const m = String(Math.floor(monitor.typingSeconds / 60)).padStart(2, '0');
      const s = String(monitor.typingSeconds % 60).padStart(2, '0');
      document.getElementById('typingTime').textContent = m + ':' + s;
    }, 1000);
  }
}

function recordKeystroke(cm, event) {
  startTypingTimer();
  const now = Date.now();
  monitor.keystrokes++;
  document.getElementById('keystrokeCount').textContent = monitor.keystrokes;
  if (monitor.lastKeyTime) {
    const interval = now - monitor.lastKeyTime;
    monitor.recentSpeeds.push(interval);
    if (monitor.recentSpeeds.length > 30) monitor.recentSpeeds.shift();
  }
  monitor.lastKeyTime = now;
  const key = event.key || '';
  if (key === 'Backspace' || key === 'Delete') {
    monitor.errors++;
    document.getElementById('errorCount').textContent = monitor.errors;
  }
  if (key === ' ' || key === 'Enter') monitor.words++;
  updateStressMetrics();
}

Object.values(editors).forEach(ed => {
  ed.on('keydown', recordKeystroke);
  ed.on('cursorActivity', function(cm) {
    const pos = cm.getCursor();
    document.getElementById('cursorPos').textContent = `Ln ${pos.line + 1}, Col ${pos.ch + 1}`;
  });
  ed.on('inputRead', function(cm, change) {
    if (change.origin === '+input') {
      try { CodeMirror.commands.autocomplete(cm, null, { completeSingle: false }); } catch(e) {}
    }
  });
});

// ============== STRESS METRICS ==============
function updateStressMetrics() {
  const elapsed = monitor.typingSeconds || 1;
  const wpm = Math.round((monitor.words / elapsed) * 60);
  document.getElementById('wpmValue').textContent = wpm;
  const errorRate = monitor.keystrokes > 0 ? ((monitor.errors / monitor.keystrokes) * 100) : 0;
  document.getElementById('errorRate').textContent = errorRate.toFixed(1) + '%';
  document.getElementById('errorCount').textContent = monitor.errors;
  document.getElementById('stressDetail').textContent = 'معدل الأخطاء: ' + errorRate.toFixed(1) + '%';

  let speedVariance = 0;
  if (monitor.recentSpeeds.length > 5) {
    const avg = monitor.recentSpeeds.reduce((a, b) => a + b, 0) / monitor.recentSpeeds.length;
    speedVariance = Math.sqrt(monitor.recentSpeeds.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / monitor.recentSpeeds.length);
  }

  let stress = 0;
  stress += Math.min(errorRate * 3, 40);
  stress += Math.min(speedVariance / 20, 30);
  if (wpm > 80) stress += 10;
  if (wpm < 10 && monitor.typingSeconds > 30) stress += 20;
  stress = Math.min(Math.round(stress), 100);
  monitor.stressLevel = stress;

  const stressFill = document.getElementById('stressFill');
  const stressPercent = document.getElementById('stressPercent');
  const stressValue = document.getElementById('stressValue');
  const stressIndicator = document.getElementById('stressIndicator');
  const stressText = document.getElementById('stressText');

  stressFill.style.width = stress + '%';
  stressPercent.textContent = stress + '%';

  if (stress < 35) {
    stressFill.style.background = 'var(--green)'; stressPercent.style.color = 'var(--green)';
    stressValue.textContent = 'منخفض'; stressValue.style.color = 'var(--green)';
    stressIndicator.className = 'stress-indicator stress-low'; stressText.textContent = 'هادئ';
  } else if (stress < 65) {
    stressFill.style.background = 'var(--yellow)'; stressPercent.style.color = 'var(--yellow)';
    stressValue.textContent = 'متوسط'; stressValue.style.color = 'var(--yellow)';
    stressIndicator.className = 'stress-indicator stress-medium'; stressText.textContent = 'متوسط';
  } else {
    stressFill.style.background = 'var(--red)'; stressPercent.style.color = 'var(--red)';
    stressValue.textContent = 'مرتفع'; stressValue.style.color = 'var(--red)';
    stressIndicator.className = 'stress-indicator stress-high'; stressText.textContent = 'مرتفع!';
  }

  if (stress > 75 && stressDetectionActive) {
    document.getElementById('stressAlert').classList.add('show');
  }

  monitor.wpmHistory.push(wpm);
  if (monitor.wpmHistory.length > 30) monitor.wpmHistory.shift();
  monitor.stressHistory.push(stress);
  if (monitor.stressHistory.length > 30) monitor.stressHistory.shift();
  drawWpmChart(); drawStressChart(); updateCognitiveLoad();
}

function closeStressAlert() {
  document.getElementById('stressAlert').classList.remove('show');
}

// ============== MINI CHARTS ==============
function drawWpmChart() {
  const canvas = document.getElementById('wpmChart');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const data = monitor.wpmHistory;
  const w = canvas.width = canvas.offsetWidth || 200;
  const h = canvas.height = canvas.offsetHeight || 50;
  ctx.clearRect(0, 0, w, h);
  if (data.length < 2) return;
  const max = Math.max(...data, 1);
  ctx.beginPath(); ctx.strokeStyle = '#89b4fa'; ctx.lineWidth = 2;
  data.forEach((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * (h - 4) - 2;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
  ctx.fillStyle = 'rgba(137,180,250,0.1)'; ctx.fill();
}

function drawStressChart() {
  const canvas = document.getElementById('stressChart');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const data = monitor.stressHistory;
  const w = canvas.width = canvas.offsetWidth || 200;
  const h = canvas.height = canvas.offsetHeight || 50;
  ctx.clearRect(0, 0, w, h);
  if (data.length < 2) return;
  ctx.lineWidth = 2;
  for (let i = 1; i < data.length; i++) {
    const x0 = ((i - 1) / (data.length - 1)) * w;
    const y0 = h - (data[i - 1] / 100) * (h - 4) - 2;
    const x1 = (i / (data.length - 1)) * w;
    const y1 = h - (data[i] / 100) * (h - 4) - 2;
    ctx.beginPath();
    ctx.strokeStyle = data[i] < 35 ? '#a6e3a1' : data[i] < 65 ? '#f9e2af' : '#f38ba8';
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
}

// ============== COGNITIVE LOAD ==============
function updateCognitiveLoad() {
  const htmlCode = editors.html.getValue();
  const cssCode  = editors.css.getValue();
  const jsCode   = editors.js.getValue();

  const htmlComplexity = Math.min(Math.round(
    (htmlCode.split('\n').length / 5) + ((htmlCode.match(/<div/gi) || []).length * 2) + ((htmlCode.match(/class=/gi) || []).length)
  ), 100);
  const cssComplexity = Math.min(Math.round(
    (cssCode.split('\n').length / 3) + ((cssCode.match(/@media/gi) || []).length * 5) + ((cssCode.match(/!/gi) || []).length * 3)
  ), 100);
  const jsComplexity = Math.min(Math.round(
    (jsCode.split('\n').length / 3) + ((jsCode.match(/function|=>/gi) || []).length * 3) + ((jsCode.match(/if|else|for|while|switch/gi) || []).length * 4)
  ), 100);
  const avg = Math.round((htmlComplexity + cssComplexity + jsComplexity) / 3);

  document.getElementById('cogValue').textContent = avg + '%';
  document.getElementById('cogHtml').textContent = htmlComplexity + '%';
  document.getElementById('cogCss').textContent = cssComplexity + '%';
  document.getElementById('cogJs').textContent = jsComplexity + '%';
  document.getElementById('cogHtmlBar').style.width = htmlComplexity + '%';
  document.getElementById('cogCssBar').style.width = cssComplexity + '%';
  document.getElementById('cogJsBar').style.width = jsComplexity + '%';

  const cogFill = document.getElementById('cogFill');
  const cogLabel = document.getElementById('cogLabel');
  cogFill.style.width = avg + '%';
  cogLabel.textContent = avg + '%';
  cogFill.style.background = avg < 40 ? 'var(--green)' : avg < 70 ? 'var(--yellow)' : 'var(--red)';
}

// ============== TAB SWITCHING ==============
function switchTab(tab) {
  if (typeof openDefaultTabs !== 'undefined' && openDefaultTabs[tab] === false) {
    openDefaultTabs[tab] = true;
    var tabEl = document.querySelector('.tab[data-tab="' + tab + '"]');
    if (tabEl) tabEl.style.display = '';
  }
  activeTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.tab[data-tab="' + tab + '"]').classList.add('active');
  document.querySelectorAll('.editor-pane').forEach(p => p.classList.remove('active'));
  document.getElementById('pane-' + tab).classList.add('active');
  editors[tab].refresh();
  document.querySelectorAll('.file-item').forEach(f => f.classList.remove('active'));
  const fileItems = document.querySelectorAll('#panelExplorer .file-item');
  const idx = tab === 'html' ? 0 : tab === 'css' ? 1 : 2;
  if (fileItems[idx]) fileItems[idx].classList.add('active');
  document.getElementById('langLabel').textContent = { html: 'HTML', css: 'CSS', js: 'JavaScript' }[tab];
}

// ============== SIDE PANEL ==============
function toggleSidePanel(panel) {
  const sp = document.getElementById('sidePanel');
  const panelMap = { explorer: 'Explorer', features: 'Features', search: 'Search', settings: 'Settings', git: 'Git' };
  if (currentPanel === panel && sp.classList.contains('open')) {
    sp.classList.remove('open'); currentPanel = '';
    document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
    return;
  }
  sp.classList.add('open'); currentPanel = panel;
  Object.values(panelMap).forEach(p => {
    const el = document.getElementById('panel' + p);
    if (el) el.style.display = 'none';
  });
  const target = document.getElementById('panel' + panelMap[panel]);
  if (target) target.style.display = '';
  document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
  const sidebarMap = { explorer: 0, features: 1, search: 2, git: 3, settings: 4 };
  const btns = document.querySelectorAll('.sidebar-btn');
  if (btns[sidebarMap[panel]]) btns[sidebarMap[panel]].classList.add('active');
  setTimeout(() => Object.values(editors).forEach(e => e.refresh()), 350);
}

// ============== PREVIEW ==============
function runPreview() {
  const htmlCode = editors.html ? editors.html.getValue() : '';
  const cssCode  = editors.css ? editors.css.getValue() : '';
  const jsCode   = editors.js ? editors.js.getValue() : '';
  const consoleInterceptor = '<scr' + 'ipt>(function(){var oc={log:console.log,warn:console.warn,error:console.error,info:console.info,clear:console.clear};function s(t,a){try{var d=Array.from(a).map(function(x){if(x===null)return"null";if(x===undefined)return"undefined";if(typeof x==="object"){try{return JSON.stringify(x,null,2)}catch(e){return String(x)}}return String(x)});window.parent.postMessage({type:"console",method:t,args:d},"*")}catch(e){}}console.log=function(){s("log",arguments);oc.log.apply(console,arguments)};console.warn=function(){s("warn",arguments);oc.warn.apply(console,arguments)};console.error=function(){s("error",arguments);oc.error.apply(console,arguments)};console.info=function(){s("info",arguments);oc.info.apply(console,arguments)};console.clear=function(){s("clear",[]);oc.clear.apply(console,arguments)};window.addEventListener("error",function(e){s("error",[e.message+" (line "+e.lineno+")"])})})();<\/scr' + 'ipt>';
  let combined = htmlCode
    .replace(/<link[^>]*href=["']style\.css["'][^>]*>/gi, '<style>' + cssCode + '</style>')
    .replace(/<script[^>]*src=["']script\.js["'][^>]*><\/script>/gi, consoleInterceptor + '<scr' + 'ipt>' + jsCode + '<\/scr' + 'ipt>');
  const frame = document.getElementById('previewFrame');
  const blob = new Blob([combined], { type: 'text/html' });
  frame.src = URL.createObjectURL(blob);
}

function togglePreview() {
  const panel = document.getElementById('previewPanel');
  const resizer = document.getElementById('resizer');
  previewVisible = !previewVisible;
  panel.style.display = previewVisible ? 'flex' : 'none';
  resizer.style.display = previewVisible ? '' : 'none';
  setTimeout(() => Object.values(editors).forEach(e => e.refresh()), 100);
}

// ============== RESIZER ==============
(function initResizer() {
  const resizer = document.getElementById('resizer');
  const previewPanel = document.getElementById('previewPanel');
  let startX, startWidth;
  resizer.addEventListener('mousedown', function(e) {
    startX = e.clientX; startWidth = previewPanel.offsetWidth;
    resizer.classList.add('active');
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    e.preventDefault();
  });
  function onMove(e) {
    const diff = startX - e.clientX;
    const nw = startWidth + diff;
    if (nw > 150 && nw < window.innerWidth * 0.7) previewPanel.style.width = nw + 'px';
  }
  function onUp() {
    resizer.classList.remove('active');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    Object.values(editors).forEach(e => e.refresh());
  }
})();

// ============== ZEN MODE ==============
function toggleZenMode() {
  zenMode = !zenMode;
  document.body.classList.toggle('zen-mode', zenMode);
  const t = document.getElementById('toggleZen');
  const b = document.getElementById('zenBtn');
  if (t) t.classList.toggle('on', zenMode);
  if (b) b.classList.toggle('active', zenMode);
  if (zenMode) showNotification('تم تفعيل وضع التركيز - اضغط Esc للخروج', 'info');
  setTimeout(() => Object.values(editors).forEach(e => e.refresh()), 300);
}
document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && zenMode) toggleZenMode(); });

// ============== VISUAL SCOPING ==============
function toggleVisualScoping() {
  visualScoping = !visualScoping;
  const t = document.getElementById('toggleScope');
  const b = document.getElementById('scopeBtn');
  if (t) t.classList.toggle('on', visualScoping);
  if (b) b.classList.toggle('active', visualScoping);
  showNotification(visualScoping ? 'تم تفعيل التركيز البصري' : 'تم إيقاف التركيز البصري', 'info');
  visualScoping ? applyVisualScoping() : clearVisualScoping();
}

function applyVisualScoping() {
  const cm = editors[activeTab];
  const cursor = cm.getCursor();
  const total = cm.lineCount();
  const indent = cm.getLine(cursor.line).search(/\S/);
  let startLine = cursor.line, endLine = cursor.line;
  for (let i = cursor.line - 1; i >= 0; i--) {
    const li = cm.getLine(i).search(/\S/);
    if (li >= 0 && li < indent && cm.getLine(i).trim().length > 0) { startLine = i; break; }
    if (li <= indent) startLine = i;
  }
  for (let i = cursor.line + 1; i < total; i++) {
    const li = cm.getLine(i).search(/\S/);
    if (li >= 0 && li < indent && cm.getLine(i).trim().length > 0) { endLine = i; break; }
    if (li <= indent) endLine = i;
  }
  for (let i = 0; i < total; i++) {
    if (i < startLine || i > endLine) cm.addLineClass(i, 'text', 'cm-scoped-dim');
    else cm.removeLineClass(i, 'text', 'cm-scoped-dim');
  }
}

function clearVisualScoping() {
  Object.values(editors).forEach(cm => {
    for (let i = 0; i < cm.lineCount(); i++) cm.removeLineClass(i, 'text', 'cm-scoped-dim');
  });
}

Object.values(editors).forEach(cm => {
  cm.on('cursorActivity', function() { if (visualScoping) applyVisualScoping(); });
});

// ============== DOM MAPPING ==============
function toggleDomMapping() {
  domMapping = !domMapping;
  const t = document.getElementById('toggleDom');
  if (t) t.classList.toggle('on', domMapping);
  showNotification(domMapping ? 'تم تفعيل ربط DOM - انقر على عناصر المعاينة' : 'تم إيقاف ربط DOM', 'info');
  if (domMapping) setupDomMapping();
}

function setupDomMapping() {
  const frame = document.getElementById('previewFrame');
  frame.addEventListener('load', function handler() {
    try {
      const doc = frame.contentDocument;
      doc.addEventListener('click', function(e) {
        if (!domMapping) return;
        e.preventDefault(); e.stopPropagation();
        doc.querySelectorAll('.dom-highlight').forEach(el => el.classList.remove('dom-highlight'));
        const el = e.target;
        el.classList.add('dom-highlight');
        el.setAttribute('data-tag', el.tagName.toLowerCase() + (el.className && el.className.split ? '.' + el.className.split(' ')[0] : ''));
        findInSource(el.tagName.toLowerCase(), el.textContent.trim().substring(0, 30));
      });
    } catch (err) { console.warn('DOM mapping error:', err); }
  });
}

function findInSource(tag, text) {
  const cm = editors.html;
  const lines = cm.getValue().split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<' + tag) && (text === '' || lines[i].includes(text.substring(0, 15)))) {
      switchTab('html');
      clearSourceHighlight();
      cm.addLineClass(i, 'wrap', 'dom-source-clicked');
      domSourceHighlightLine = i;
      cm.setCursor({ line: i, ch: 0 });
      cm.scrollIntoView({ line: i, ch: 0 }, 100);
      cm.focus();
      showArrowBadge(cm, i, tag);
      showNotification('\u25c4 <' + tag + '> \u2014 \u0627\u0644\u0633\u0637\u0631 ' + (i + 1) + ' \u2014 \u0627\u0636\u063a\u0637 \u0644\u0644\u062a\u0639\u062f\u064a\u0644', 'info');
      return;
    }
  }
}


// ============== TOGGLES ==============
function toggleCogMeter() {
  cogMeterActive = !cogMeterActive;
  const t = document.getElementById('toggleCog');
  if (t) t.classList.toggle('on', cogMeterActive);
  const m = document.querySelector('.cognitive-meter');
  if (m) m.style.display = cogMeterActive ? 'flex' : 'none';
}

function toggleStressDetection() {
  stressDetectionActive = !stressDetectionActive;
  const t = document.getElementById('toggleStress');
  if (t) t.classList.toggle('on', stressDetectionActive);
  const i = document.getElementById('stressIndicator');
  if (i) i.style.display = stressDetectionActive ? 'flex' : 'none';
}

function toggleDashboard() {
  document.getElementById('bottomPanel').classList.toggle('open');
  setTimeout(() => Object.values(editors).forEach(e => e.refresh()), 300);
}

// ============== MENTAL MODEL VISUALIZER ==============
function showMentalModel() {
  document.getElementById('mentalModelModal').classList.add('show');
  setTimeout(buildMentalModelTree, 100);
}

function closeMentalModel() {
  document.getElementById('mentalModelModal').classList.remove('show');
}

function buildMentalModelTree() {
  const container = document.getElementById('mentalModelContent');
  const detailPanel = document.getElementById('mentalModelDetail');
  const htmlCode = editors.html.getValue();

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlCode, 'text/html');
  const body = doc.body;

  if (!body) {
    container.innerHTML = '<div class="mm-empty"><i class="fas fa-code"></i><p>لا يوجد محتوى HTML لعرضه</p></div>';
    return;
  }

  // Stress tip when stress is high
  let stressTip = '';
  if (monitor.stressLevel > 50) {
    stressTip = '<div class="mm-stress-tip"><i class="fas fa-spa"></i> خذ نفسًا عميقًا. ركّز على عنصر واحد في كل مرة.</div>';
  }

  container.innerHTML = stressTip +
    '<input type="text" class="mm-search-box" placeholder="ابحث عن عنصر..." oninput="filterMentalModelTree(this.value)">' +
    '<div class="mm-tree-root" id="mmTreeRoot">' + buildMentalModelNode(body, 0) + '</div>';

  detailPanel.innerHTML = '<div class="mm-detail-empty"><i class="fas fa-hand-pointer"></i><p>اختر عنصرًا من الشجرة<br>لعرض تنسيقاته ومعاينته</p></div>';
}

function buildMentalModelNode(element, depth) {
  if (!element || !element.tagName || depth > 10) return '';
  const tag = element.tagName.toLowerCase();
  if (['script', 'style', 'link', 'meta', 'head', 'title'].includes(tag)) return '';

  const children = Array.from(element.children).filter(function(c) {
    return !['script', 'style', 'link', 'meta', 'title'].includes(c.tagName.toLowerCase());
  });
  const hasChildren = children.length > 0;

  var classes = '';
  if (element.className && typeof element.className === 'string') classes = element.className.trim();
  var id = element.id || '';

  var textContent = '';
  for (var n = 0; n < element.childNodes.length; n++) {
    if (element.childNodes[n].nodeType === 3 && element.childNodes[n].textContent.trim()) {
      textContent = element.childNodes[n].textContent.trim().substring(0, 35);
      break;
    }
  }

  var tagColor = 'var(--red)';
  if (['div', 'span', 'section', 'article', 'main', 'aside'].includes(tag)) tagColor = 'var(--peach)';
  else if (['h1','h2','h3','h4','h5','h6','p','a','li','ul','ol'].includes(tag)) tagColor = 'var(--blue)';
  else if (['nav','header','footer'].includes(tag)) tagColor = 'var(--green)';
  else if (['img','video','audio','canvas','svg'].includes(tag)) tagColor = 'var(--mauve)';
  else if (['input','button','form','select','textarea'].includes(tag)) tagColor = 'var(--yellow)';

  var safeClasses = classes.replace(/'/g, '');
  var html = '<div class="mm-node" data-tag="' + tag + '" data-classes="' + safeClasses + '">';
  html += '<div class="mm-node-header" onclick="selectMentalModelNode(this)" data-tag="' + tag + '" data-classes="' + safeClasses + '" data-id="' + id + '">';

  if (hasChildren) {
    html += '<span class="mm-arrow expanded" onclick="event.stopPropagation();this.classList.toggle(\'expanded\');this.closest(\'.mm-node\').querySelector(\'.mm-children\').classList.toggle(\'collapsed\');">\u25B6</span>';
  } else {
    html += '<span class="mm-leaf-dot" style="color:' + tagColor + ';">\u25CF</span>';
  }

  html += '<span class="mm-tag" style="color:' + tagColor + ';">&lt;' + tag + '&gt;</span>';
  if (id) html += '<span class="mm-id">#' + id + '</span>';
  if (classes) html += '<span class="mm-class">.' + classes.split(' ').join('.') + '</span>';
  if (textContent && !hasChildren) html += '<span class="mm-text">"' + textContent.replace(/</g, '&lt;').replace(/"/g, '&quot;') + '"</span>';
  html += '</div>';

  if (hasChildren) {
    html += '<div class="mm-children">';
    children.forEach(function(child) { html += buildMentalModelNode(child, depth + 1); });
    html += '</div>';
  }

  html += '</div>';
  return html;
}

function filterMentalModelTree(query) {
  var nodes = document.querySelectorAll('#mmTreeRoot .mm-node');
  if (!query || query.length < 1) {
    nodes.forEach(function(n) { n.style.display = ''; });
    return;
  }
  var q = query.toLowerCase();
  nodes.forEach(function(n) {
    var tag = (n.getAttribute('data-tag') || '').toLowerCase();
    var cls = (n.getAttribute('data-classes') || '').toLowerCase();
    var header = n.querySelector('.mm-node-header');
    var text = header ? header.textContent.toLowerCase() : '';
    if (tag.includes(q) || cls.includes(q) || text.includes(q)) {
      n.style.display = '';
      var parent = n.parentElement;
      while (parent && !parent.id) {
        if (parent.classList.contains('mm-children')) parent.classList.remove('collapsed');
        parent = parent.parentElement;
      }
    } else if (!n.querySelector('.mm-node[style=""]') && !n.querySelector('.mm-node:not([style])')) {
      n.style.display = 'none';
    }
  });
}

function selectMentalModelNode(nodeEl) {
  document.querySelectorAll('.mm-node-header').forEach(function(n) { n.classList.remove('mm-selected'); });
  nodeEl.classList.add('mm-selected');

  var tag = nodeEl.getAttribute('data-tag');
  var classes = nodeEl.getAttribute('data-classes') || '';
  var id = nodeEl.getAttribute('data-id') || '';
  var detailPanel = document.getElementById('mentalModelDetail');
  var cssCode = editors.css.getValue();

  var matchingRules = findMatchingCSSRules(tag, classes, id, cssCode);

  var html = '';

  // Element info
  html += '<div class="mm-detail-section">';
  html += '<div class="mm-detail-title"><i class="fas fa-tag" style="color:var(--red)"></i> معلومات العنصر</div>';
  html += '<div class="mm-element-info">';
  html += '<span class="mm-info-tag">&lt;' + tag + '&gt;</span>';
  if (id) html += '<span class="mm-info-id">#' + id + '</span>';
  if (classes) {
    classes.split(' ').filter(function(c){return c;}).forEach(function(c) {
      html += '<span class="mm-info-class">.' + c + '</span>';
    });
  }
  html += '</div></div>';

  // CSS Rules
  html += '<div class="mm-detail-section">';
  html += '<div class="mm-detail-title"><i class="fas fa-paint-brush" style="color:var(--blue)"></i> قواعد CSS المطابقة (' + matchingRules.length + ')</div>';
  if (matchingRules.length > 0) {
    matchingRules.forEach(function(rule) {
      html += '<div class="mm-css-rule">';
      html += '<div class="mm-css-selector">' + rule.selector + '</div>';
      html += '<pre class="mm-css-code">' + escapeHTML(rule.properties) + '</pre>';
      html += '<button class="mm-goto-btn" onclick="closeMentalModel();switchTab(\'css\');goToCSSLine(' + rule.line + ')"><i class="fas fa-arrow-left"></i> السطر ' + (rule.line + 1) + '</button>';
      html += '</div>';
    });
  } else {
    html += '<div class="mm-no-rules"><i class="fas fa-info-circle"></i> لا توجد قواعد CSS مباشرة لهذا العنصر</div>';
  }
  html += '</div>';

  // Mini Preview
  html += '<div class="mm-detail-section">';
  html += '<div class="mm-detail-title"><i class="fas fa-eye" style="color:var(--green)"></i> المعاينة الفعلية</div>';
  html += '<div class="mm-preview-box" id="mmPreviewBox"></div>';
  html += '</div>';

  // Source location
  html += '<div class="mm-detail-section">';
  html += '<div class="mm-detail-title"><i class="fas fa-code" style="color:var(--peach)"></i> الموقع في الكود</div>';
  var lineNum = findElementInHTML(tag, classes, id);
  if (lineNum >= 0) {
    html += '<button class="mm-goto-btn full-width" onclick="closeMentalModel();switchTab(\'html\');editors.html.setCursor({line:' + lineNum + ',ch:0});editors.html.scrollIntoView({line:' + lineNum + ',ch:0},100);editors.html.focus();"><i class="fas fa-file-code"></i> index.html - السطر ' + (lineNum + 1) + '</button>';
  }
  html += '</div>';

  detailPanel.innerHTML = html;
  renderMiniPreview(tag, classes, id);
}

function escapeHTML(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function findMatchingCSSRules(tag, classes, id, cssCode) {
  var rules = [];
  var lines = cssCode.split('\n');
  var i = 0;

  while (i < lines.length) {
    var line = lines[i].trim();
    var selectorMatch = line.match(/^([^{}@\/][^{}]*?)\s*\{/);
    if (selectorMatch) {
      var selector = selectorMatch[1].trim();
      var startLine = i;
      if (doesSelectorMatch(selector, tag, classes, id)) {
        var props = '';
        var braceCount = 0;
        for (var j = i; j < lines.length; j++) {
          braceCount += (lines[j].match(/\{/g) || []).length;
          braceCount -= (lines[j].match(/\}/g) || []).length;
          if (j > i && lines[j].trim() !== '}') props += lines[j].trim() + '\n';
          if (braceCount <= 0) break;
        }
        props = props.trim();
        if (props) rules.push({ selector: selector, properties: props, line: startLine });
      }
    }
    i++;
  }
  return rules;
}

function doesSelectorMatch(selector, tag, classes, id) {
  var selectors = selector.split(',').map(function(s){return s.trim();});
  for (var k = 0; k < selectors.length; k++) {
    var sel = selectors[k].replace(/::?[\w-]+/g, '').trim();
    if (sel === tag) return true;
    if (id && (sel === '#' + id || sel === tag + '#' + id)) return true;
    if (classes) {
      var classArr = classes.split(' ').filter(function(c){return c;});
      for (var m = 0; m < classArr.length; m++) {
        if (sel === '.' + classArr[m] || sel === tag + '.' + classArr[m] || sel.includes('.' + classArr[m])) return true;
      }
    }
  }
  return false;
}

function findElementInHTML(tag, classes, id) {
  var lines = editors.html.getValue().split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (line.includes('<' + tag)) {
      if (id && line.includes('id="' + id + '"')) return i;
      if (classes) {
        var classArr = classes.split(' ').filter(function(c){return c;});
        for (var m = 0; m < classArr.length; m++) {
          if (line.includes(classArr[m])) return i;
        }
      }
      if (!id && !classes) return i;
    }
  }
  return -1;
}

function goToCSSLine(line) {
  editors.css.setCursor({ line: line, ch: 0 });
  editors.css.scrollIntoView({ line: line, ch: 0 }, 100);
  editors.css.focus();
}

function renderMiniPreview(tag, classes, id) {
  var box = document.getElementById('mmPreviewBox');
  if (!box) return;

  var htmlCode = editors.html.getValue();
  var cssCode = editors.css.getValue();

  var parser = new DOMParser();
  var doc = parser.parseFromString(htmlCode, 'text/html');
  var targetEl = null;

  if (id) targetEl = doc.getElementById(id);
  else if (classes) {
    var cls = classes.split(' ')[0];
    if (cls) { var els = doc.querySelectorAll('.' + cls); if (els.length > 0) targetEl = els[0]; }
  }
  if (!targetEl) { var els = doc.querySelectorAll(tag); if (els.length > 0) targetEl = els[0]; }

  var elHTML = targetEl ? targetEl.outerHTML : '<div style="color:#cdd6f4;font-family:Cairo;font-size:12px;">لا يمكن عرض المعاينة</div>';
  var previewHTML = '<!DOCTYPE html><html dir="rtl"><head><style>' + cssCode.replace(/</g, '\\3c ') + ' body{display:flex;align-items:center;justify-content:center;min-height:80px;padding:10px;margin:0;background:#1e1e2e;overflow:auto;}</style></head><body>' + elHTML + '</body></html>';

  var iframe = document.createElement('iframe');
  iframe.className = 'mm-preview-iframe';
  iframe.sandbox = 'allow-same-origin';
  box.innerHTML = '';
  box.appendChild(iframe);
  iframe.contentDocument.open();
  iframe.contentDocument.write(previewHTML);
  iframe.contentDocument.close();
}

// ============== CODE CHUNKING ==============
function showCodeChunking() {
  document.getElementById('codeChunkingModal').classList.add('show');
  analyzeCodeChunks();
}
function closeCodeChunking() { document.getElementById('codeChunkingModal').classList.remove('show'); }

function analyzeCodeChunks() {
  const body = document.getElementById('chunkingBody');
  const code = editors[activeTab].getValue();
  const lines = code.split('\n');
  const suggestions = [];

  if (activeTab === 'html') {
    let sectionStart = 0;
    lines.forEach((line, i) => {
      if (line.match(/<(section|main|header|footer|nav|article|div)/i)) sectionStart = i;
      if (line.match(/<\/(section|main|header|footer|nav|article|div)/i) && i - sectionStart > 20) {
        suggestions.push({ title: 'قسم كبير (' + (sectionStart + 1) + '-' + (i + 1) + ')', desc: 'يحتوي على ' + (i - sectionStart) + ' سطر. ينصح بتقسيمه.', line: sectionStart });
      }
    });
  } else if (activeTab === 'css') {
    let bs = 0, bc = 0;
    lines.forEach((line, i) => {
      if (line.includes('{')) { if (bc === 0) bs = i; bc++; }
      if (line.includes('}')) { bc--; if (bc === 0 && i - bs > 15) suggestions.push({ title: 'قاعدة CSS كبيرة (' + (bs + 1) + '-' + (i + 1) + ')', desc: (i - bs) + ' سطر. يمكن تقسيمها.', line: bs }); }
    });
  } else {
    lines.forEach((line, i) => {
      if (line.match(/function\s+\w+|=>\s*\{/)) {
        let end = i, braces = 0;
        for (let j = i; j < lines.length; j++) {
          braces += (lines[j].match(/\{/g) || []).length - (lines[j].match(/\}/g) || []).length;
          if (braces <= 0) { end = j; break; }
        }
        if (end - i > 20) suggestions.push({ title: 'دالة كبيرة (' + (i + 1) + '-' + (end + 1) + ')', desc: (end - i) + ' سطر. ينصح بتقسيمها.', line: i });
      }
    });
  }

  if (lines.length > 50) suggestions.push({ title: 'ملف كبير (' + lines.length + ' سطر)', desc: 'ينصح بتقسيمه لتسهيل الصيانة.', line: 0 });
  if (suggestions.length === 0) suggestions.push({ title: 'الكود منظم جيدا!', desc: 'لا توجد اقتراحات حاليا.', line: -1 });

  body.innerHTML = suggestions.map(s =>
    '<div class="chunk-suggestion"><h5><i class="fas fa-puzzle-piece"></i> ' + s.title + '</h5><p>' + s.desc + '</p>' +
    (s.line >= 0 ? '<button class="chunk-btn" onclick="goToLine(' + s.line + ')"><i class="fas fa-arrow-left"></i> الانتقال للسطر ' + (s.line + 1) + '</button>' : '') + '</div>'
  ).join('');
}

function goToLine(line) {
  closeCodeChunking();
  editors[activeTab].setCursor({ line, ch: 0 });
  editors[activeTab].scrollIntoView({ line, ch: 0 }, 100);
  editors[activeTab].focus();
}

// ============== SEARCH ==============
function searchInCode(query) {
  const div = document.getElementById('searchResults');
  if (!query || query.length < 2) { div.innerHTML = ''; return; }
  const results = [];
  const names = { html: 'index.html', css: 'style.css', js: 'script.js' };
  const icons = { html: 'fab fa-html5 html-icon', css: 'fab fa-css3-alt css-icon', js: 'fab fa-js js-icon' };
  Object.keys(editors).forEach(key => {
    editors[key].getValue().split('\n').forEach((line, i) => {
      if (line.toLowerCase().includes(query.toLowerCase()))
        results.push({ file: names[key], icon: icons[key], line: i + 1, text: line.trim().substring(0, 50), tab: key, idx: i });
    });
  });
  div.innerHTML = results.length === 0 ? '<p style="font-size:12px;color:var(--subtext);padding:8px;">لا توجد نتائج</p>'
    : results.slice(0, 20).map(r =>
      '<div class="file-item" onclick="switchTab(\'' + r.tab + '\');editors[\'' + r.tab + '\'].setCursor({line:' + r.idx + ',ch:0});editors[\'' + r.tab + '\'].scrollIntoView({line:' + r.idx + ',ch:0},100);editors[\'' + r.tab + '\'].focus();">' +
      '<i class="' + r.icon + '"></i><div style="flex:1;overflow:hidden;"><div style="font-size:11px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + r.text.replace(/</g,'&lt;') + '</div>' +
      '<div style="font-size:10px;color:var(--subtext);">' + r.file + ' : ' + r.line + '</div></div></div>'
    ).join('');
}

// ============== SETTINGS ==============
function changeFontSize(size) {
  Object.values(editors).forEach(cm => { cm.getWrapperElement().style.fontSize = size + 'px'; cm.refresh(); });
}
function changeTheme(theme) { Object.values(editors).forEach(cm => cm.setOption('theme', theme)); }
function toggleWordWrap() {
  const t = document.getElementById('toggleWrap'), isOn = t.classList.toggle('on');
  Object.values(editors).forEach(cm => cm.setOption('lineWrapping', isOn));
}
function toggleLineNumbers() {
  const t = document.getElementById('toggleLineNum'), isOn = t.classList.toggle('on');
  Object.values(editors).forEach(cm => cm.setOption('lineNumbers', isOn));
}

// ============== NOTIFICATIONS ==============
function showNotification(text, type) {
  type = type || 'info';
  const n = document.getElementById('notification');
  const icon = n.querySelector('i');
  document.getElementById('notifText').textContent = text;
  n.className = 'notification ' + type;
  icon.className = type === 'success' ? 'fas fa-check-circle' : type === 'warning' ? 'fas fa-exclamation-triangle' : 'fas fa-info-circle';
  n.classList.add('show');
  clearTimeout(n._t);
  n._t = setTimeout(() => n.classList.remove('show'), 3000);
}


// ============== DOM TREE PANEL ==============
let domTreeActive = false;
let styleReviewActive = false;

function toggleDomTreePanel() {
  domTreeActive = !domTreeActive;
  const panel = document.getElementById('domTreePanel');
  const btn = document.getElementById('domTreeBtn');
  panel.classList.toggle('show', domTreeActive);
  btn.classList.toggle('active', domTreeActive);
  if (domTreeActive && styleReviewActive) toggleStyleReview();
  if (domTreeActive) {
    if (!domMapping) toggleDomMapping();
    setupDomTreeClick();
  }
}

function setupDomTreeClick() {
  const frame = document.getElementById('previewFrame');
  const trySetup = () => {
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      doc.removeEventListener('click', handleDomTreeClick);
      doc.addEventListener('click', handleDomTreeClick);
      doc.removeEventListener('mouseover', handleDomTreeHover);
      doc.removeEventListener('mouseout', handleDomTreeHoverOut);
      doc.addEventListener('mouseover', handleDomTreeHover);
      doc.addEventListener('mouseout', handleDomTreeHoverOut);
    } catch(e) { console.warn('DOM tree setup error:', e); }
  };
  trySetup();
  frame.addEventListener('load', trySetup);
}

function handleDomTreeHover(e) {
  if (!domTreeActive) return;
  var el = e.target;
  if (el.tagName === 'HTML' || el.tagName === 'BODY') return;
  el.classList.add('dom-preview-hover');
  clearTimeout(domHoverTimer);
  domHoverTimer = setTimeout(function() {
    var tag = el.tagName.toLowerCase();
    var text = el.textContent ? el.textContent.trim().substring(0, 30) : '';
    highlightSourceLine(tag, text);
  }, 200);
}


function handleDomTreeHoverOut(e) {
  e.target.classList.remove('dom-preview-hover');
  if (!e.target.classList.contains('dom-highlight')) {
    e.target.style.outline = '';
    e.target.style.outlineOffset = '';
  }
  clearTimeout(domHoverTimer);
  clearSourceHighlight();
}


function handleDomTreeClick(e) {
  if (!domTreeActive) return;
  e.preventDefault();
  e.stopPropagation();
  const doc = e.target.ownerDocument;
  doc.querySelectorAll('.dom-highlight').forEach(el => { el.classList.remove('dom-highlight'); el.style.outline=''; el.style.outlineOffset=''; });
  const el = e.target;
  el.classList.add('dom-highlight');
  el.setAttribute('data-tag', el.tagName.toLowerCase());
  buildDomTree(el);
  findInSource(el.tagName.toLowerCase(), el.textContent.trim().substring(0, 30));
}

function buildDomTree(targetElement) {
  const container = document.getElementById('domTreeContent');
  const path = [];
  let current = targetElement;
  while (current && current.tagName) { path.unshift(current); current = current.parentElement; }
  const body = targetElement.ownerDocument.body;
  if (!body) return;
  container.innerHTML = buildTreeHTML(body, targetElement, path, 0);
}

function buildTreeHTML(element, targetElement, activePath, depth) {
  if (!element || !element.tagName || depth > 15) return '';
  const tag = element.tagName.toLowerCase();
  const isActive = element === targetElement;
  const isInPath = activePath.includes(element);
  const children = Array.from(element.children).filter(c => !['script','style','link','meta'].includes(c.tagName.toLowerCase()));
  const hasChildren = children.length > 0;
  const isExpanded = isInPath || isActive;
  let classes = '';
  if (element.className && typeof element.className === 'string') {
    classes = element.className.split(' ').filter(c => c && c !== 'dom-highlight').map(c => '.' + c).join('');
  }
  const id = element.id ? '#' + element.id : '';
  let textContent = '';
  if (!hasChildren && element.textContent) {
    const t = element.textContent.trim();
    textContent = t.substring(0, 30) + (t.length > 30 ? '...' : '');
  }
  let html = '<div class="dom-node" style="margin-right:' + (depth * 16) + 'px;">';
  html += '<div class="dom-node-item' + (isActive ? ' active-node' : '') + '" onclick="domNodeClick(this)">';
  if (hasChildren) {
    html += '<span class="node-arrow ' + (isExpanded ? 'expanded' : '') + '" onclick="toggleTreeNode(event, this)">&#9654;</span>';
  } else {
    html += '<span style="width:14px;display:inline-block;"></span>';
  }
  html += '<span class="node-tag">&lt;' + tag + '&gt;</span>';
  if (id) html += '<span class="node-id">' + id + '</span>';
  if (classes) html += '<span class="node-class">' + classes.substring(0, 25) + '</span>';
  if (textContent) html += '<span class="node-text">"' + textContent.replace('<', '&lt;') + '"</span>';
  html += '</div>';
  if (hasChildren) {
    html += '<div class="dom-node-children' + (isExpanded ? '' : ' collapsed') + '">';
    children.forEach(function(child) { html += buildTreeHTML(child, targetElement, activePath, depth + 1); });
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function toggleTreeNode(event, arrow) {
  event.stopPropagation();
  arrow.classList.toggle('expanded');
  const children = arrow.closest('.dom-node-item').nextElementSibling;
  if (children && children.classList.contains('dom-node-children')) children.classList.toggle('collapsed');
}

function domNodeClick(nodeItem) {
  document.querySelectorAll('.dom-node-item').forEach(n => n.classList.remove('active-node'));
  nodeItem.classList.add('active-node');
  const tagSpan = nodeItem.querySelector('.node-tag');
  if (tagSpan) {
    const tag = tagSpan.textContent.replace(/[<>]/g, '');
    const textSpan = nodeItem.querySelector('.node-text');
    const text = textSpan ? textSpan.textContent.replace(/"/g, '').trim() : '';
    findInSource(tag, text);
  }
}

// ============== DOM SOURCE HIGHLIGHTING ==============
let domSourceHighlightLine = null;
let domHoverTimer = null;

function highlightSourceLine(tag, text) {
  clearSourceHighlight();
  const cm = editors.html;
  const lines = cm.getValue().split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<' + tag) && (text === '' || lines[i].includes(text.substring(0, 15)))) {
      switchTab('html');
      cm.addLineClass(i, 'wrap', 'dom-source-highlight');
      domSourceHighlightLine = i;
      cm.scrollIntoView({ line: i, ch: 0 }, 100);
      showArrowBadge(cm, i, tag);
      return;
    }
  }
}

function clearSourceHighlight() {
  if (domSourceHighlightLine !== null) {
    editors.html.removeLineClass(domSourceHighlightLine, 'wrap', 'dom-source-highlight');
    editors.html.removeLineClass(domSourceHighlightLine, 'wrap', 'dom-source-clicked');
    domSourceHighlightLine = null;
  }
  removeArrowBadge();
}

function showArrowBadge(cm, line, tag) {
  removeArrowBadge();
  try {
    var coords = cm.charCoords({ line: line, ch: 0 }, 'page');
    var badge = document.createElement('div');
    badge.className = 'dom-arrow-badge';
    badge.id = 'domArrowBadge';
    badge.innerHTML = '<i class="fas fa-location-arrow" style="font-size:10px;"></i> &lt;' + tag + '&gt; \u2014 \u0627\u0644\u0633\u0637\u0631 ' + (line + 1);
    badge.style.top = (coords.top - 30) + 'px';
    badge.style.left = coords.left + 'px';
    document.body.appendChild(badge);
  } catch(e) {}
}

function removeArrowBadge() {
  var b = document.getElementById('domArrowBadge');
  if (b) b.remove();
}

// ============== FILE MANAGEMENT ==============
function createNewFileDialog() {
  document.getElementById('newFileModal').classList.add('show');
  var inp = document.getElementById('newFileName');
  inp.value = '';
  setTimeout(function() { inp.focus(); }, 100);
}
function closeNewFileDialog() { document.getElementById('newFileModal').classList.remove('show'); }

function createNewFile() {
  var nameInput = document.getElementById('newFileName');
  var name = nameInput.value.trim();
  if (!name) { showNotification('\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0627\u0633\u0645 \u0627\u0644\u0645\u0644\u0641', 'warning'); return; }
  if (!name.includes('.')) name += '.html';
  var ext = name.split('.').pop().toLowerCase();
  var mode = 'htmlmixed', icon = 'fas fa-file-code', iconColor = 'var(--text)';
  if (ext === 'css') { mode = 'css'; icon = 'fab fa-css3-alt'; iconColor = '#264de4'; }
  else if (ext === 'js') { mode = 'javascript'; icon = 'fab fa-js'; iconColor = '#f7df1e'; }
  else if (ext === 'html' || ext === 'htm') { mode = 'htmlmixed'; icon = 'fab fa-html5'; iconColor = '#e34c26'; }
  else if (ext === 'cs') { mode = 'text/x-csharp'; icon = 'fas fa-code'; iconColor = '#68217a'; }
  else if (ext === 'py') { mode = 'python'; icon = 'fab fa-python'; iconColor = '#3776ab'; }
  else if (ext === 'mjs' || ext === 'node') { mode = 'javascript'; icon = 'fab fa-node-js'; iconColor = '#68a063'; }
  if (editors[name]) { showNotification('\u0627\u0644\u0645\u0644\u0641 \u0645\u0648\u062c\u0648\u062f: ' + name, 'warning'); return; }
  var safeId = name.replace(/[^a-zA-Z0-9]/g, '_');
  var tabsBar = document.querySelector('.tabs-bar');
  var tab = document.createElement('div');
  tab.className = 'tab';
  tab.setAttribute('data-tab', name);
  tab.onclick = function() { switchToCustomTab(name); };
  tab.innerHTML = '<i class="' + icon + '" style="color:' + iconColor + '"></i> ' + name + ' <span class="close-tab"><i class="fas fa-times"></i></span>';
  tab.querySelector('.close-tab').addEventListener('click', function(ev) { ev.stopPropagation(); closeCustomTab(name); });
  tabsBar.appendChild(tab);
  var container = document.querySelector('.editors-wrapper > div:first-child');
  var pane = document.createElement('div');
  pane.className = 'editor-pane';
  pane.id = 'pane-' + safeId;
  var textarea = document.createElement('textarea');
  textarea.id = 'editor-' + safeId;
  pane.appendChild(textarea);
  container.appendChild(pane);
  var cm = CodeMirror.fromTextArea(textarea, Object.assign({}, editorConfig, { mode: mode }));
  editors[name] = cm;
  cm.on('change', function() { clearTimeout(previewTimer); previewTimer = setTimeout(runPreview, 1500); updateCognitiveLoad(); });
  cm.on('keydown', recordKeystroke);
  cm.on('cursorActivity', function(c) { var p = c.getCursor(); document.getElementById('cursorPos').textContent = 'Ln ' + (p.line+1) + ', Col ' + (p.ch+1); });
  var explorer = document.querySelector('#panelExplorer .side-panel-content');
  var fi = document.createElement('div');
  fi.className = 'file-item';
  fi.setAttribute('data-file', name);
  fi.onclick = function() { switchToCustomTab(name); };
  fi.innerHTML = '<i class="' + icon + '" style="color:' + iconColor + '"></i> ' + name;
  explorer.appendChild(fi);
  switchToCustomTab(name);
  closeNewFileDialog();
  showNotification('\u062a\u0645 \u0625\u0646\u0634\u0627\u0621: ' + name, 'success');
}

function switchToCustomTab(name) {
  document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('.editor-pane').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.file-item').forEach(function(f) { f.classList.remove('active'); });
  var tab = document.querySelector('.tab[data-tab="' + name + '"]');
  if (tab) tab.classList.add('active');
  var defaults = { html:1, css:1, js:1 };
  var paneId = defaults[name] ? 'pane-' + name : 'pane-' + name.replace(/[^a-zA-Z0-9]/g, '_');
  var pane = document.getElementById(paneId);
  if (pane) pane.classList.add('active');
  activeTab = name;
  var fi = document.querySelector('.file-item[data-file="' + name + '"]');
  if (fi) fi.classList.add('active');
  if (editors[name]) setTimeout(function() { editors[name].refresh(); }, 50);
  var ext = name.split('.').pop() || name;
  var langMap = { html:'HTML', htm:'HTML', css:'CSS', js:'JavaScript', json:'JSON', txt:'Text', cs:'C#', py:'Python', mjs:'Node.js', node:'Node.js' };
  document.getElementById('langLabel').textContent = langMap[ext] || ext.toUpperCase();
}

// Track open state of default tabs
var openDefaultTabs = { html: true, css: true, js: true };

function closeTab(name) {
  if (name === 'html' || name === 'css' || name === 'js') {
    openDefaultTabs[name] = false;
    var tabEl = document.querySelector('.tab[data-tab="' + name + '"]');
    if (tabEl) tabEl.style.display = 'none';
    var pane = document.getElementById('pane-' + name);
    if (pane) pane.classList.remove('active');
    if (activeTab === name) {
      var found = false;
      ['html','css','js'].forEach(function(t) {
        if (!found && openDefaultTabs[t]) { switchTab(t); found = true; }
      });
      if (!found) {
        var tabs = document.querySelectorAll('.tab');
        for (var i = 0; i < tabs.length; i++) {
          if (tabs[i].style.display !== 'none') {
            var tn = tabs[i].getAttribute('data-tab');
            if (['html','css','js'].includes(tn)) switchTab(tn);
            else switchToCustomTab(tn);
            found = true; break;
          }
        }
      }
      if (!found) { activeTab = ''; document.querySelectorAll('.editor-pane').forEach(function(p){p.classList.remove('active');}); }
    }
    var nameMap = {html:'index.html',css:'style.css',js:'script.js'};
    showNotification('\u062A\u0645 \u0625\u063A\u0644\u0627\u0642: ' + nameMap[name], 'info');
    return;
  }
  closeCustomTab(name);
}

function closeCustomTab(name) {
  var tab = document.querySelector('.tab[data-tab="' + name + '"]');
  if (tab) tab.remove();
  var pane = document.getElementById('pane-' + name.replace(/[^a-zA-Z0-9]/g, '_'));
  if (pane) pane.remove();
  var fi = document.querySelector('.file-item[data-file="' + name + '"]');
  if (fi) fi.remove();
  delete editors[name];
  switchTab('html');
  showNotification('\u062a\u0645 \u0625\u063a\u0644\u0627\u0642: ' + name, 'info');
}

function saveCurrentFile() {
  var name = activeTab;
  var fileName = name;
  if (name === 'html') fileName = 'index.html';
  else if (name === 'css') fileName = 'style.css';
  else if (name === 'js') fileName = 'script.js';
  var content = editors[name].getValue();
  var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  showNotification('\u062a\u0645 \u062d\u0641\u0638: ' + fileName, 'success');
}

function loadFiles(event) {
  var files = event.target.files;
  if (!files || files.length === 0) return;
  Array.from(files).forEach(function(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var content = e.target.result;
      var fname = file.name;
      var ext = fname.split('.').pop().toLowerCase();
      if ((ext === 'html' || ext === 'htm') && !editors[fname]) {
        editors.html.setValue(content); switchTab('html');
        showNotification('\u062a\u0645 \u062a\u062d\u0645\u064a\u0644: ' + fname + ' \u2192 HTML', 'success');
      } else if (ext === 'css' && !editors[fname]) {
        editors.css.setValue(content); switchTab('css');
        showNotification('\u062a\u0645 \u062a\u062d\u0645\u064a\u0644: ' + fname + ' \u2192 CSS', 'success');
      } else if (ext === 'js' && !editors[fname]) {
        editors.js.setValue(content); switchTab('js');
        showNotification('\u062a\u0645 \u062a\u062d\u0645\u064a\u0644: ' + fname + ' \u2192 JS', 'success');
      } else {
        document.getElementById('newFileName').value = fname;
        createNewFile();
        if (editors[fname]) editors[fname].setValue(content);
      }
    };
    reader.readAsText(file);
  });
  event.target.value = '';
}


// ============== STYLE REVIEW ==============
let styleInspectActive = false;

function toggleStyleReview() {
  styleReviewActive = !styleReviewActive;
  var btn = document.getElementById('styleReviewBtn');
  var panel = document.getElementById('styleReviewPanel');
  btn.classList.toggle('active', styleReviewActive);
  panel.classList.toggle('show', styleReviewActive);

  if (styleReviewActive) {
    if (domTreeActive) toggleDomTreePanel();
    enableStyleInspect();
  } else {
    disableStyleInspect();
  }
}

function closeStyleInspector() {
  styleReviewActive = false;
  var btn = document.getElementById('styleReviewBtn');
  if (btn) btn.classList.toggle('active', false);
  document.getElementById('styleReviewPanel').classList.remove('show');
  disableStyleInspect();
}

function enableStyleInspect() {
  var frame = document.getElementById('previewFrame');
  var tryEnable = function() {
    try {
      var doc = frame.contentDocument;
      if (!doc || !doc.head) return;
      var old = doc.getElementById('si-inspect-styles');
      if (old) old.remove();
      var style = doc.createElement('style');
      style.id = 'si-inspect-styles';
      style.textContent = '.si-hover{outline:2px dashed #89b4fa !important;outline-offset:2px;cursor:crosshair !important;background-color:rgba(137,180,250,0.06) !important;transition:all .1s;}.si-selected{outline:3px solid #a6e3a1 !important;outline-offset:2px;background-color:rgba(166,227,161,0.06) !important;}';
      doc.head.appendChild(style);
      doc.removeEventListener('mouseover', styleInspectHover);
      doc.removeEventListener('mouseout', styleInspectHoverOut);
      doc.removeEventListener('click', styleInspectClick);
      doc.addEventListener('mouseover', styleInspectHover);
      doc.addEventListener('mouseout', styleInspectHoverOut);
      doc.addEventListener('click', styleInspectClick);
    } catch(e) { console.warn('Style inspect setup error:', e); }
  };
  tryEnable();
  frame.addEventListener('load', tryEnable);

  document.getElementById('styleReviewContent').innerHTML =
    '<div class="si-instruction"><i class="fas fa-mouse-pointer"></i><h4>وضع الفحص نشط</h4><p>مرر الماوس على عناصر المعاينة ثم انقر<br>لعرض تنسيقات CSS والخصائص المحسوبة</p></div>';
}

function disableStyleInspect() {
  var frame = document.getElementById('previewFrame');
  try {
    var doc = frame.contentDocument;
    if (!doc) return;
    var style = doc.getElementById('si-inspect-styles');
    if (style) style.remove();
    doc.querySelectorAll('.si-hover,.si-selected').forEach(function(el) { el.classList.remove('si-hover','si-selected'); });
    doc.removeEventListener('mouseover', styleInspectHover);
    doc.removeEventListener('mouseout', styleInspectHoverOut);
    doc.removeEventListener('click', styleInspectClick);
  } catch(e) {}
}

function styleInspectHover(e) {
  var el = e.target;
  if (el.tagName === 'HTML' || el.tagName === 'BODY') return;
  el.classList.add('si-hover');
}

function styleInspectHoverOut(e) {
  e.target.classList.remove('si-hover');
}

function styleInspectClick(e) {
  e.preventDefault();
  e.stopPropagation();
  var doc = e.target.ownerDocument;
  doc.querySelectorAll('.si-selected').forEach(function(el) { el.classList.remove('si-selected'); });
  var el = e.target;
  if (el.tagName === 'HTML' || el.tagName === 'BODY') return;
  el.classList.add('si-selected');
  analyzeSelectedElement(el);
  if (typeof updateConsoleStyles === "function") updateConsoleStyles(el);
}

function analyzeSelectedElement(el) {
  var container = document.getElementById('styleReviewContent');
  var tag = el.tagName.toLowerCase();
  var classes = (el.className && typeof el.className === 'string') ? el.className.replace(/si-selected|si-hover/g,'').trim() : '';
  var id = el.id || '';
  var frame = document.getElementById('previewFrame');
  var win = frame.contentWindow;
  var style = win.getComputedStyle(el);
  var cssCode = editors.css.getValue();

  var html = '';

  // Header
  html += '<div class="si-element-header">';
  html += '<div class="si-tag-badge">&lt;' + tag + '&gt;</div>';
  if (id) html += '<span class="si-id-badge">#' + id + '</span>';
  if (classes) html += '<span class="si-class-badge">.' + classes.split(' ').filter(function(c){return c;}).join(' .') + '</span>';
  html += '</div>';

  // Tabs
  html += '<div class="si-tabs">';
  html += '<button class="si-tab active" onclick="switchInspectorTab(this,\'siStyles\')"><i class="fas fa-paint-brush"></i> التنسيقات</button>';
  html += '<button class="si-tab" onclick="switchInspectorTab(this,\'siBox\')"><i class="fas fa-vector-square"></i> Box Model</button>';
  html += '<button class="si-tab" onclick="switchInspectorTab(this,\'siComputed\')"><i class="fas fa-sliders-h"></i> Computed</button>';
  html += '<button class="si-tab" onclick="switchInspectorTab(this,\'siSuggestions\')"><i class="fas fa-lightbulb"></i> اقتراحات</button>';
  html += '</div>';

  // Tab: CSS Rules
  html += '<div class="si-tab-content active" id="siStyles">';
  var matchingRules = findMatchingCSSRules(tag, classes, id, cssCode);
  if (matchingRules.length > 0) {
    matchingRules.forEach(function(rule) {
      html += '<div class="si-rule-card">';
      html += '<div class="si-rule-selector">' + escapeHTML(rule.selector) + ' <span class="si-rule-line">السطر ' + (rule.line + 1) + '</span></div>';
      html += '<pre class="si-rule-props">' + escapeHTML(rule.properties) + '</pre>';
      html += '<button class="si-goto-btn" onclick="closeStyleInspector();switchTab(\'css\');goToCSSLine(' + rule.line + ')"><i class="fas fa-external-link-alt"></i> اذهب للكود</button>';
      html += '</div>';
    });
  } else {
    html += '<div class="si-no-rules"><i class="fas fa-info-circle"></i> لا توجد قواعد CSS مكتوبة مباشرة</div>';
  }
  html += '</div>';

  // Tab: Box Model
  var mt = parseInt(style.marginTop)||0, mr = parseInt(style.marginRight)||0, mb = parseInt(style.marginBottom)||0, ml = parseInt(style.marginLeft)||0;
  var bt = parseInt(style.borderTopWidth)||0, brr = parseInt(style.borderRightWidth)||0, bb = parseInt(style.borderBottomWidth)||0, bl = parseInt(style.borderLeftWidth)||0;
  var pt = parseInt(style.paddingTop)||0, pr = parseInt(style.paddingRight)||0, pb = parseInt(style.paddingBottom)||0, pl = parseInt(style.paddingLeft)||0;
  var w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);

  html += '<div class="si-tab-content" id="siBox" style="display:none;">';
  html += '<div class="si-box-model">';
  html += '<div class="si-box-margin"><div class="si-box-label">margin</div><div class="si-box-value si-box-top">'+mt+'</div><div class="si-box-value si-box-right">'+mr+'</div><div class="si-box-value si-box-bottom">'+mb+'</div><div class="si-box-value si-box-left">'+ml+'</div>';
  html += '<div class="si-box-border"><div class="si-box-label">border</div><div class="si-box-value si-box-top">'+bt+'</div><div class="si-box-value si-box-right">'+brr+'</div><div class="si-box-value si-box-bottom">'+bb+'</div><div class="si-box-value si-box-left">'+bl+'</div>';
  html += '<div class="si-box-padding"><div class="si-box-label">padding</div><div class="si-box-value si-box-top">'+pt+'</div><div class="si-box-value si-box-right">'+pr+'</div><div class="si-box-value si-box-bottom">'+pb+'</div><div class="si-box-value si-box-left">'+pl+'</div>';
  html += '<div class="si-box-content"><span>'+w+' x '+h+'</span></div>';
  html += '</div></div></div></div></div>';

  // Tab: Computed
  html += '<div class="si-tab-content" id="siComputed" style="display:none;">';
  var props = ['display','position','width','height','color','background-color','font-size','font-family','font-weight','line-height','text-align','flex-direction','justify-content','align-items','grid-template-columns','gap','border-radius','box-shadow','opacity','z-index','overflow','transition','transform'];
  html += '<div class="si-computed-list">';
  props.forEach(function(prop) {
    var val = style.getPropertyValue(prop);
    if (val && val !== 'none' && val !== 'normal' && val !== 'auto' && val !== '0px' && val !== 'visible' && val !== 'static') {
      html += '<div class="si-computed-item"><span class="si-prop-name">' + prop + '</span><span class="si-prop-value">' + val + '</span></div>';
    }
  });
  html += '</div></div>';

  // Tab: Suggestions
  html += '<div class="si-tab-content" id="siSuggestions" style="display:none;">';
  var suggestions = generateStyleSuggestions(el, style, tag, classes, cssCode, win);
  if (suggestions.length > 0) {
    suggestions.forEach(function(s) {
      html += '<div class="si-suggestion ' + s.type + '">';
      html += '<div class="si-suggestion-icon"><i class="' + s.icon + '"></i></div>';
      html += '<div class="si-suggestion-body"><h5>' + s.title + '</h5><p>' + s.desc + '</p>';
      if (s.code) html += '<pre class="si-suggestion-code">' + s.code + '</pre>';
      html += '</div></div>';
    });
  } else {
    html += '<div class="si-no-rules"><i class="fas fa-check-circle" style="color:var(--green)"></i> العنصر يبدو بحالة ممتازة!</div>';
  }
  html += '</div>';

  // Mini Preview
  html += '<div class="si-preview-section">';
  html += '<div class="si-detail-title"><i class="fas fa-eye" style="color:var(--teal)"></i> معاينة العنصر</div>';
  html += '<div class="si-mini-preview" id="siPreviewBox"></div>';
  html += '</div>';

  container.innerHTML = html;
  renderStyleInspectPreview(el);
}

function switchInspectorTab(btn, tabId) {
  btn.closest('.si-tabs').querySelectorAll('.si-tab').forEach(function(t) { t.classList.remove('active'); });
  btn.classList.add('active');
  var parent = btn.closest('.si-tabs').parentElement;
  parent.querySelectorAll('.si-tab-content').forEach(function(c) { c.style.display = 'none'; c.classList.remove('active'); });
  var target = document.getElementById(tabId);
  if (target) { target.style.display = ''; target.classList.add('active'); }
}
function getEffectiveBg(el, win) {
  var current = el;
  while (current) {
    var bg = win.getComputedStyle(current).backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
      return bg;
    }
    current = current.parentElement;
  }
  return 'rgb(255, 255, 255)';
}

function parseColor(color) {
  var m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) return { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]) };
  return { r: 0, g: 0, b: 0 };
}

function luminance(r, g, b) {
  var a = [r, g, b].map(function(v) {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function getContrastRatio(color1, color2) {
  var c1 = parseColor(color1);
  var c2 = parseColor(color2);
  var l1 = luminance(c1.r, c1.g, c1.b);
  var l2 = luminance(c2.r, c2.g, c2.b);
  var lighter = Math.max(l1, l2);
  var darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
function generateStyleSuggestions(el, style, tag, classes, cssCode, win) {
  var suggestions = [];

  if (el.textContent && el.textContent.trim().length > 0 && el.children.length === 0) {
    var bgC = getEffectiveBg(el, win);
    var contrast = getContrastRatio(style.color, bgC);
    if (contrast < 4.5 && contrast > 0) {
      suggestions.push({type:'warning',icon:'fas fa-eye-slash',title:'\u062A\u0628\u0627\u064A\u0646 \u0636\u0639\u064A\u0641 ('+contrast.toFixed(1)+':1)',desc:'\u0627\u0644\u0646\u0633\u0628\u0629 \u0623\u0642\u0644 \u0645\u0646 4.5:1 \u0627\u0644\u0645\u0648\u0635\u0649 \u0628\u0647\u0627. \u0642\u062F \u064A\u0635\u0639\u0628 \u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0646\u0635.',code:'color: #ffffff; /* \u0623\u0648 \u063A\u064A\u0651\u0631 \u0644\u0648\u0646 \u0627\u0644\u062E\u0644\u0641\u064A\u0629 */'});
    }
  }

  if (tag === 'a' || tag === 'button' || (classes && classes.includes('btn'))) {
    var hasTr = style.transition && style.transition !== 'all 0s ease 0s' && style.transition !== 'none';
    if (!hasTr) {
      suggestions.push({type:'info',icon:'fas fa-magic',title:'\u0623\u0636\u0641 \u062A\u0623\u062B\u064A\u0631 \u0627\u0646\u062A\u0642\u0627\u0644\u064A',desc:'\u0627\u0644\u0639\u0646\u0635\u0631 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A \u0628\u062F\u0648\u0646 transition \u064A\u0628\u062F\u0648 \u063A\u064A\u0631 \u0627\u062D\u062A\u0631\u0627\u0641\u064A',code:'transition: all 0.3s ease;'});
    }
    if ((parseInt(style.borderRadius)||0) === 0) {
      suggestions.push({type:'info',icon:'fas fa-square',title:'\u062D\u0648\u0627\u0641 \u062D\u0627\u062F\u0629',desc:'\u0627\u0644\u0623\u0632\u0631\u0627\u0631 \u0628\u062D\u0648\u0627\u0641 \u0645\u0633\u062A\u062F\u064A\u0631\u0629 \u0623\u0643\u062B\u0631 \u062D\u062F\u0627\u062B\u0629',code:'border-radius: 6px;'});
    }
  }

  var fontSize = parseInt(style.fontSize);
  if (fontSize < 12 && el.textContent && el.textContent.trim().length > 0) {
    suggestions.push({type:'warning',icon:'fas fa-font',title:'\u062D\u062C\u0645 \u062E\u0637 \u0635\u063A\u064A\u0631 ('+fontSize+'px)',desc:'\u0627\u0644\u062D\u062F \u0627\u0644\u0623\u062F\u0646\u0649 \u0627\u0644\u0645\u0648\u0635\u0649 \u0628\u0647 14px',code:'font-size: 14px;'});
  }

  var maxPad = Math.max(parseInt(style.paddingTop)||0, parseInt(style.paddingBottom)||0, parseInt(style.paddingLeft)||0, parseInt(style.paddingRight)||0);
  if (maxPad > 80) {
    suggestions.push({type:'info',icon:'fas fa-arrows-alt',title:'padding \u0643\u0628\u064A\u0631 ('+maxPad+'px)',desc:'\u0642\u064A\u0645\u0629 \u0643\u0628\u064A\u0631\u0629 \u0642\u062F \u062A\u0624\u062B\u0631 \u0639\u0644\u0649 \u0627\u0644\u062A\u0635\u0645\u064A\u0645',code:'padding: 20px 30px;'});
  }

  if (tag === 'img' && !el.getAttribute('alt')) {
    suggestions.push({type:'error',icon:'fas fa-image',title:'\u0635\u0648\u0631\u0629 \u0628\u062F\u0648\u0646 alt',desc:'\u0645\u0647\u0645 \u0644\u0644\u0648\u0635\u0648\u0644\u064A\u0629 \u0648SEO',code:'<img src="..." alt="\u0648\u0635\u0641 \u0627\u0644\u0635\u0648\u0631\u0629">'});
  }

  return suggestions;
}

function renderStyleInspectPreview(el) {
  var box = document.getElementById('siPreviewBox');
  if (!box) return;

  var cssCode = editors.css.getValue();
  var elHTML = el.outerHTML;

  var iframe = document.createElement('iframe');
  iframe.className = 'si-preview-iframe';
  iframe.sandbox = 'allow-same-origin';
  box.innerHTML = '';
  box.appendChild(iframe);

  var previewHTML = '<!DOCTYPE html><html dir="rtl"><head><style>' + cssCode + ' body{display:flex;align-items:center;justify-content:center;min-height:80px;padding:10px;margin:0;background:#1e1e2e;overflow:auto;}</style></head><body>' + elHTML + '</body></html>';
  iframe.contentDocument.open();
  iframe.contentDocument.write(previewHTML);
  iframe.contentDocument.close();
}

function analyzeStyleIssues() {
  toggleStyleReview();
}

// ============== AUTO PREVIEW & INIT ==============
let previewTimer;
Object.values(editors).forEach(cm => {
  cm.on('change', function() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(runPreview, 1500);
    updateCognitiveLoad();
  });
});

setTimeout(runPreview, 500);
setTimeout(updateCognitiveLoad, 600);
window.addEventListener('resize', () => Object.values(editors).forEach(e => e.refresh()));



// ============== CONSOLE PANEL ==============
let consolePanelActive = false;
let consoleHistory = [];
let consoleHistoryIndex = -1;
let selectedPreviewElement = null;

function toggleConsolePanel() {
  consolePanelActive = !consolePanelActive;
  var panel = document.getElementById('consolePanel');
  var btn = document.getElementById('consolePanelBtn');
  if (panel) panel.classList.toggle('show', consolePanelActive);
  if (btn) btn.classList.toggle('active', consolePanelActive);
  if (consolePanelActive) {
    var inp = document.getElementById('consoleInput');
    if (inp) setTimeout(function(){ inp.focus(); }, 100);
  }
  setTimeout(function() { Object.values(editors).forEach(function(e){ if(e && e.refresh) e.refresh(); }); }, 300);
}

function clearConsole() {
  var el = document.getElementById('consoleMessages');
  if (el) el.innerHTML = '';
}

function addConsoleMessage(type, text) {
  var container = document.getElementById('consoleMessages');
  if (!container) return;
  var msg = document.createElement('div');
  msg.className = 'console-message console-' + type;
  var icon = 'fas fa-chevron-right';
  if (type === 'error') icon = 'fas fa-times-circle';
  else if (type === 'warn') icon = 'fas fa-exclamation-triangle';
  else if (type === 'info') icon = 'fas fa-info-circle';
  else if (type === 'command') icon = 'fas fa-angle-right';
  else if (type === 'result') icon = 'fas fa-angle-left';
  msg.innerHTML = '<span class="console-msg-icon"><i class="' + icon + '"></i></span><span class="console-msg-text">' + escapeHTML(text) + '</span>';
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function executeConsoleCommand() {
  var input = document.getElementById('consoleInput');
  var code = input.value.trim();
  if (!code) return;
  consoleHistory.push(code);
  consoleHistoryIndex = consoleHistory.length;
  addConsoleMessage('command', code);
  try {
    var frame = document.getElementById('previewFrame');
    var result = frame.contentWindow.eval(code);
    if (result !== undefined) {
      var resultStr = (typeof result === 'object') ? JSON.stringify(result, null, 2) : String(result);
      addConsoleMessage('result', resultStr);
    }
  } catch(e) {
    addConsoleMessage('error', e.message);
  }
  input.value = '';
}

function handleConsoleKeydown(event) {
  if (event.key === 'Enter') {
    executeConsoleCommand();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (consoleHistoryIndex > 0) {
      consoleHistoryIndex--;
      document.getElementById('consoleInput').value = consoleHistory[consoleHistoryIndex];
    }
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (consoleHistoryIndex < consoleHistory.length - 1) {
      consoleHistoryIndex++;
      document.getElementById('consoleInput').value = consoleHistory[consoleHistoryIndex];
    } else {
      consoleHistoryIndex = consoleHistory.length;
      document.getElementById('consoleInput').value = '';
    }
  }
}

// Listen for console messages from iframe
window.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'console') {
    if (e.data.method === 'clear') {
      clearConsole();
    } else {
      addConsoleMessage(e.data.method, e.data.args.join(' '));
    }
  }
});

function switchConsoleTab(tab) {
  document.querySelectorAll('.console-tab').forEach(function(t){ t.classList.remove('active'); });
  document.querySelectorAll('.console-tab-content').forEach(function(c){ c.style.display = 'none'; c.classList.remove('active'); });
  if (tab === 'console') {
    var ct = document.querySelector('.console-tab:first-child');
    if (ct) ct.classList.add('active');
    var co = document.getElementById('consoleOutput');
    if (co) { co.style.display = ''; co.classList.add('active'); }
  } else {
    var ct2 = document.querySelector('.console-tab:last-child');
    if (ct2) ct2.classList.add('active');
    var cs = document.getElementById('consoleStyles');
    if (cs) { cs.style.display = ''; cs.classList.add('active'); }
  }
}

// ============== CONSOLE STYLES - LIVE CSS EDITING ==============
function updateConsoleStyles(el) {
  selectedPreviewElement = el;
  var container = document.getElementById('consoleStylesContent');
  if (!container) return;
  if (!el) {
    container.innerHTML = '<div class="console-styles-hint"><i class="fas fa-mouse-pointer"></i> \u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u0639\u0646\u0635\u0631 \u0641\u064A \u0627\u0644\u0645\u0639\u0627\u064A\u0646\u0629 \u0644\u062A\u0639\u062F\u064A\u0644 \u062A\u0646\u0633\u064A\u0642\u0627\u062A\u0647</div>';
    return;
  }
  var tag = el.tagName.toLowerCase();
  var classes = (el.className && typeof el.className === 'string') ? el.className.replace(/si-selected|si-hover|dom-highlight|dom-preview-hover/g,'').trim() : '';
  var id = el.id || '';
  var frame = document.getElementById('previewFrame');
  var style = frame.contentWindow.getComputedStyle(el);

  var html = '<div class="console-element-tag">';
  html += '<span class="console-el-tag">&lt;' + tag + '&gt;</span>';
  if (id) html += ' <span class="console-el-id">#' + id + '</span>';
  if (classes) html += ' <span class="console-el-class">.' + classes.split(' ').filter(function(c){return c;}).join('.') + '</span>';
  html += '</div>';

  // Inline styles
  html += '<div class="console-style-section">';
  html += '<div class="console-style-title">element.style {</div>';
  html += '<div class="console-style-props" id="inlineStyleProps">';
  var inlineStyle = el.getAttribute('style') || '';
  if (inlineStyle) {
    var pairs = inlineStyle.split(';').filter(function(s){return s.trim();});
    pairs.forEach(function(pair, idx) {
      var parts = pair.split(':');
      if (parts.length >= 2) {
        var prop = parts[0].trim();
        var val = parts.slice(1).join(':').trim();
        html += '<div class="console-style-prop"><span class="console-prop-name" contenteditable="true" onblur="updateElementStyle()">' + escapeHTML(prop) + '</span>: <span class="console-prop-value" contenteditable="true" onblur="updateElementStyle()">' + escapeHTML(val) + '</span>;</div>';
      }
    });
  }
  html += '<div class="console-add-style" onclick="addNewStyleProp()"><i class="fas fa-plus"></i> \u0623\u0636\u0641 \u062A\u0646\u0633\u064A\u0642</div>';
  html += '</div>';
  html += '<div class="console-style-close">}</div>';
  html += '</div>';

  // Quick editing
  html += '<div class="console-style-section">';
  html += '<div class="console-style-title"><i class="fas fa-sliders-h"></i> \u062A\u0639\u062F\u064A\u0644 \u0633\u0631\u064A\u0639</div>';
  html += '<div class="console-quick-styles">';

  var quickProps = [
    {prop:'color',type:'color',val:style.color},
    {prop:'background-color',type:'color',val:style.backgroundColor},
    {prop:'font-size',type:'text',val:style.fontSize},
    {prop:'padding',type:'text',val:style.padding},
    {prop:'margin',type:'text',val:style.margin},
    {prop:'border-radius',type:'text',val:style.borderRadius},
    {prop:'width',type:'text',val:style.width},
    {prop:'height',type:'text',val:style.height},
    {prop:'display',type:'select',val:style.display,options:['block','inline','inline-block','flex','grid','none']},
    {prop:'opacity',type:'range',val:style.opacity,min:0,max:1,step:0.1}
  ];

  quickProps.forEach(function(qp) {
    html += '<div class="console-quick-prop">';
    html += '<label class="console-quick-label">' + qp.prop + '</label>';
    if (qp.type === 'color') {
      html += '<div class="console-quick-input-wrap">';
      html += '<input type="color" class="console-quick-color" value="' + rgbToHex(qp.val) + '" oninput="applyQuickStyle(\'' + qp.prop + '\',this.value)">';
      html += '<input type="text" class="console-quick-text" value="' + escapeHTML(qp.val) + '" onchange="applyQuickStyle(\'' + qp.prop + '\',this.value)">';
      html += '</div>';
    } else if (qp.type === 'select') {
      html += '<select class="console-quick-select" onchange="applyQuickStyle(\'' + qp.prop + '\',this.value)">';
      qp.options.forEach(function(opt) {
        html += '<option value="'+opt+'"' + (qp.val === opt ? ' selected' : '') + '>'+opt+'</option>';
      });
      html += '</select>';
    } else if (qp.type === 'range') {
      html += '<div class="console-quick-input-wrap">';
      html += '<input type="range" class="console-quick-range" min="'+qp.min+'" max="'+qp.max+'" step="'+qp.step+'" value="'+qp.val+'" oninput="applyQuickStyle(\'' + qp.prop + '\',this.value);this.nextElementSibling.value=this.value">';
      html += '<input type="text" class="console-quick-text console-quick-range-val" value="' + qp.val + '" onchange="applyQuickStyle(\'' + qp.prop + '\',this.value)">';
      html += '</div>';
    } else {
      html += '<input type="text" class="console-quick-text" value="' + escapeHTML(qp.val) + '" onchange="applyQuickStyle(\'' + qp.prop + '\',this.value)">';
    }
    html += '</div>';
  });

  html += '</div></div>';
  container.innerHTML = html;
}

function rgbToHex(rgb) {
  if (!rgb || rgb === 'transparent') return '#000000';
  var m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) return '#' + [m[1],m[2],m[3]].map(function(x){return parseInt(x).toString(16).padStart(2,'0');}).join('');
  if (rgb.startsWith('#')) return rgb;
  return '#000000';
}

function applyQuickStyle(prop, value) {
  if (!selectedPreviewElement) return;
  selectedPreviewElement.style.setProperty(prop, value);
}

function addNewStyleProp() {
  if (!selectedPreviewElement) return;
  var propsDiv = document.getElementById('inlineStyleProps');
  if (!propsDiv) return;
  var newProp = document.createElement('div');
  newProp.className = 'console-style-prop';
  newProp.innerHTML = '<span class="console-prop-name" contenteditable="true" onblur="updateElementStyle()">property</span>: <span class="console-prop-value" contenteditable="true" onblur="updateElementStyle()">value</span>;';
  var addBtn = propsDiv.querySelector('.console-add-style');
  propsDiv.insertBefore(newProp, addBtn);
  newProp.querySelector('.console-prop-name').focus();
}

function updateElementStyle() {
  if (!selectedPreviewElement) return;
  var props = document.querySelectorAll('#inlineStyleProps .console-style-prop');
  props.forEach(function(p) {
    var nameEl = p.querySelector('.console-prop-name');
    var valEl = p.querySelector('.console-prop-value');
    if (nameEl && valEl && nameEl.textContent.trim() && valEl.textContent.trim() && nameEl.textContent.trim() !== 'property') {
      selectedPreviewElement.style.setProperty(nameEl.textContent.trim(), valEl.textContent.trim());
    }
  });
}

// ============== CLOSE TAB HANDLERS FOR DEFAULT TABS ==============
(function initDefaultTabCloseHandlers() {
  document.querySelectorAll('.tab[data-tab="html"] .close-tab, .tab[data-tab="css"] .close-tab, .tab[data-tab="js"] .close-tab').forEach(function(btn) {
    btn.addEventListener('click', function(ev) {
      ev.stopPropagation();
      var tab = this.closest('.tab');
      if (tab) {
        var tabName = tab.getAttribute('data-tab');
        closeTab(tabName);
      }
    });
  });
})();


// ============== TAP SYSTEM - HTML Snippet Shortcuts ==============
// Uses Alt key as modifier (Alt+D = div, Alt+S = section, etc.)
// 1 tap = basic tag, 2 taps = tag+class, 3 taps = tag+class+id+children

const tapSnippets = {
  // -- HTML Structure --
  'KeyD': {
    tag: 'div', label: 'div',
    single: '<div>|</div>',
    double: '<div class="|">\n  \n</div>',
    triple: '<div class="|" id="">\n  \n</div>'
  },
  'KeyS': {
    tag: 'section', label: 'section',
    single: '<section>|</section>',
    double: '<section class="|">\n  \n</section>',
    triple: '<section class="|" id="">\n  \n</section>'
  },
  'KeyA': {
    tag: 'article', label: 'article',
    single: '<article>|</article>',
    double: '<article class="|">\n  \n</article>',
    triple: '<article class="|" id="">\n  \n</article>'
  },
  'KeyN': {
    tag: 'nav', label: 'nav',
    single: '<nav>|</nav>',
    double: '<nav class="|">\n  \n</nav>',
    triple: '<nav class="|" id="">\n  \n</nav>'
  },
  'KeyH': {
    tag: 'header', label: 'header',
    single: '<header>|</header>',
    double: '<header class="|">\n  \n</header>',
    triple: '<header class="|" id="">\n  \n</header>'
  },
  'KeyF': {
    tag: 'footer', label: 'footer',
    single: '<footer>|</footer>',
    double: '<footer class="|">\n  \n</footer>',
    triple: '<footer class="|" id="">\n  \n</footer>'
  },
  'KeyM': {
    tag: 'main', label: 'main',
    single: '<main>|</main>',
    double: '<main class="|">\n  \n</main>',
    triple: '<main class="|" id="">\n  \n</main>'
  },
  // -- Content --
  'KeyP': {
    tag: 'p', label: 'p',
    single: '<p>|</p>',
    double: '<p class="|"></p>',
    triple: '<p class="|" id=""></p>'
  },
  'Digit1': {
    tag: 'h1', label: 'h1',
    single: '<h1>|</h1>',
    double: '<h1 class="|"></h1>',
    triple: '<h1 class="|" id=""></h1>'
  },
  'Digit2': {
    tag: 'h2', label: 'h2',
    single: '<h2>|</h2>',
    double: '<h2 class="|"></h2>',
    triple: '<h2 class="|" id=""></h2>'
  },
  'Digit3': {
    tag: 'h3', label: 'h3',
    single: '<h3>|</h3>',
    double: '<h3 class="|"></h3>',
    triple: '<h3 class="|" id=""></h3>'
  },
  'Digit4': {
    tag: 'h4', label: 'h4',
    single: '<h4>|</h4>',
    double: '<h4 class="|"></h4>',
    triple: '<h4 class="|" id=""></h4>'
  },
  'Digit5': {
    tag: 'h5', label: 'h5',
    single: '<h5>|</h5>',
    double: '<h5 class="|"></h5>',
    triple: '<h5 class="|" id=""></h5>'
  },
  'Digit6': {
    tag: 'h6', label: 'h6',
    single: '<h6>|</h6>',
    double: '<h6 class="|"></h6>',
    triple: '<h6 class="|" id=""></h6>'
  },
  'KeyB': {
    tag: 'button', label: 'button',
    single: '<button>|</button>',
    double: '<button class="|"></button>',
    triple: '<button class="|" id="" type="button"></button>'
  },
  'KeyI': {
    tag: 'input', label: 'input',
    single: '<input type="|">',
    double: '<input type="text" class="|" placeholder="">',
    triple: '<input type="text" class="|" id="" name="" placeholder="">'
  },
  'KeyL': {
    tag: 'label', label: 'label',
    single: '<label>|</label>',
    double: '<label class="|" for=""></label>',
    triple: '<label class="|" id="" for=""></label>'
  },
  'KeyU': {
    tag: 'ul', label: 'ul > li',
    single: '<ul>\n  <li>|</li>\n</ul>',
    double: '<ul class="|">\n  <li></li>\n  <li></li>\n  <li></li>\n</ul>',
    triple: '<ul class="|" id="">\n  <li></li>\n  <li></li>\n  <li></li>\n  <li></li>\n  <li></li>\n</ul>'
  },
  'KeyO': {
    tag: 'ol', label: 'ol > li',
    single: '<ol>\n  <li>|</li>\n</ol>',
    double: '<ol class="|">\n  <li></li>\n  <li></li>\n  <li></li>\n</ol>',
    triple: '<ol class="|" id="">\n  <li></li>\n  <li></li>\n  <li></li>\n  <li></li>\n  <li></li>\n</ol>'
  },
  'KeyT': {
    tag: 'table', label: 'table',
    single: '<table>\n  <tr>\n    <td>|</td>\n  </tr>\n</table>',
    double: '<table class="|">\n  <thead>\n    <tr>\n      <th></th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td></td>\n    </tr>\n  </tbody>\n</table>',
    triple: '<table class="|" id="">\n  <thead>\n    <tr>\n      <th></th>\n      <th></th>\n      <th></th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td></td>\n      <td></td>\n      <td></td>\n    </tr>\n    <tr>\n      <td></td>\n      <td></td>\n      <td></td>\n    </tr>\n  </tbody>\n</table>'
  },
  // -- Media --
  'KeyG': {
    tag: 'img', label: 'img',
    single: '<img src="|" alt="">',
    double: '<img src="|" alt="" class="">',
    triple: '<img src="|" alt="" class="" id="" width="" height="">'
  },
  'KeyV': {
    tag: 'video', label: 'video',
    single: '<video src="|" controls></video>',
    double: '<video class="|" controls>\n  <source src="" type="video/mp4">\n</video>',
    triple: '<video class="|" id="" controls width="" height="">\n  <source src="" type="video/mp4">\n  <source src="" type="video/webm">\n</video>'
  },
  'KeyK': {
    tag: 'a', label: 'a (link)',
    single: '<a href="|"></a>',
    double: '<a href="|" target="_blank"></a>',
    triple: '<a href="|" target="_blank" class="" id="" rel="noopener noreferrer"></a>'
  },
  // -- Utilities --
  'KeyW': {
    tag: 'div', label: 'wrapper',
    single: '<div class="wrapper">|</div>',
    double: '<div class="wrapper |">\n  \n</div>',
    triple: '<div class="wrapper |" id="">\n  \n</div>'
  },
  'KeyC': {
    tag: 'div', label: 'container',
    single: '<div class="container">|</div>',
    double: '<div class="container |">\n  \n</div>',
    triple: '<div class="container |" id="">\n  \n</div>'
  },
  'KeyX': {
    tag: 'div', label: 'flex',
    single: '<div class="flex">|</div>',
    double: '<div class="flex |">\n  \n</div>',
    triple: '<div class="flex |" id="">\n  <div></div>\n  <div></div>\n  <div></div>\n</div>'
  },
  'KeyZ': {
    tag: 'div', label: 'grid',
    single: '<div class="grid">|</div>',
    double: '<div class="grid |">\n  \n</div>',
    triple: '<div class="grid |" id="">\n  <div></div>\n  <div></div>\n  <div></div>\n</div>'
  }
};

// Tap tracking state
var tapState = { lastCode: null, count: 0, timer: null, timeout: 400 };
var tapSystemEnabled = true;

function showTapIndicator(label, level) {
  var indicator = document.getElementById('tapIndicator');
  if (!indicator) return;
  var levelNames = { single: '\u0661\xD7 \u0628\u0633\u064A\u0637', double: '\u0662\xD7 \u0645\u0639 class', triple: '\u0663\xD7 \u0643\u0627\u0645\u0644' };
  var levelIcons = { single: '\u2460', double: '\u2461', triple: '\u2462' };
  indicator.innerHTML = '<div class="tap-ind-icon">' + levelIcons[level] + '</div>' +
    '<div class="tap-ind-info"><span class="tap-ind-tag">&lt;' + label + '&gt;</span>' +
    '<span class="tap-ind-level">' + levelNames[level] + '</span></div>';
  indicator.className = 'tap-indicator show tap-level-' + level;
  clearTimeout(indicator._ht);
  indicator._ht = setTimeout(function() { indicator.classList.remove('show'); }, 2000);
}

function showTapCounter(label, count) {
  var indicator = document.getElementById('tapIndicator');
  if (!indicator) return;
  var dots = '';
  for (var i = 1; i <= 3; i++) dots += (i <= count ? '\u25CF' : '\u25CB');
  indicator.innerHTML = '<div class="tap-ind-icon tap-counting">' + count + '</div>' +
    '<div class="tap-ind-info"><span class="tap-ind-tag">&lt;' + label + '&gt;</span>' +
    '<span class="tap-ind-dots">' + dots + '</span></div>';
  indicator.className = 'tap-indicator show tap-counting-active';
}

function insertTapSnippet(code, level) {
  var snippet = tapSnippets[code];
  if (!snippet) return;
  var cm = editors[activeTab];
  if (!cm) return;
  var text = snippet[level];
  var cursor = cm.getCursor();
  var currentLine = cm.getLine(cursor.line);
  var indent = currentLine.match(/^(\s*)/)[1];
  var lines = text.split('\n');
  var insertText = lines.map(function(l, i) { return i === 0 ? l : indent + l; }).join('\n');
  var markerPos = insertText.indexOf('|');
  var cleanText = insertText.replace('|', '');
  cm.replaceRange(cleanText, cursor);
  if (markerPos >= 0) {
    var before = cleanText.substring(0, markerPos);
    var beforeLines = before.split('\n');
    var targetLine = cursor.line + beforeLines.length - 1;
    var targetCh = beforeLines.length === 1 ? cursor.ch + beforeLines[0].length : beforeLines[beforeLines.length - 1].length;
    cm.setCursor({ line: targetLine, ch: targetCh });
  }
  cm.focus();
  showTapIndicator(snippet.label, level);
}

function processTap(code) {
  var snippet = tapSnippets[code];
  if (!snippet) return;
  if (tapState.lastCode === code) { tapState.count++; } else { tapState.count = 1; tapState.lastCode = code; }
  clearTimeout(tapState.timer);
  if (tapState.count >= 3) {
    insertTapSnippet(code, 'triple');
    tapState.count = 0; tapState.lastCode = null;
    return;
  }
  showTapCounter(snippet.label, tapState.count);
  tapState.timer = setTimeout(function() {
    if (tapState.count === 1) insertTapSnippet(code, 'single');
    else if (tapState.count === 2) insertTapSnippet(code, 'double');
    tapState.count = 0; tapState.lastCode = null;
  }, tapState.timeout);
}

function handleTapSystemKey(e) {
  if (!tapSystemEnabled || !e.altKey) return;
  if (tapSnippets[e.code]) {
    e.preventDefault();
    e.stopPropagation();
    processTap(e.code);
    return false;
  }
}

// Initialize tap system on all editors
Object.values(editors).forEach(function(ed) {
  ed.on('keydown', function(cm, e) { handleTapSystemKey(e); });
});

// Toggle tap system on/off
function toggleTapSystem() {
  tapSystemEnabled = !tapSystemEnabled;
  var t = document.getElementById('toggleTap');
  if (t) t.classList.toggle('on', tapSystemEnabled);
  showNotification(tapSystemEnabled ? '\u062A\u0645 \u062A\u0641\u0639\u064A\u0644 Tap System' : '\u062A\u0645 \u0625\u064A\u0642\u0627\u0641 Tap System', 'info');
}

// Shortcuts reference modal
var tapShortcutsOpen = false;
function toggleTapShortcuts() {
  tapShortcutsOpen = !tapShortcutsOpen;
  var modal = document.getElementById('tapShortcutsModal');
  if (modal) modal.classList.toggle('show', tapShortcutsOpen);
}
function closeTapShortcuts() {
  tapShortcutsOpen = false;
  var modal = document.getElementById('tapShortcutsModal');
  if (modal) modal.classList.remove('show');
}

// Apply tap system to dynamically created editors too
var _origCreateNewFile = typeof createNewFile === 'function' ? createNewFile : null;
if (_origCreateNewFile) {
  var _origSwitchCustom = switchToCustomTab;
  // Patch: after creating new file, add tap system listener
  var patchInterval = setInterval(function() {
    Object.keys(editors).forEach(function(key) {
      var ed = editors[key];
      if (!ed._tapSystemBound) {
        ed.on('keydown', function(cm, e) { handleTapSystemKey(e); });
        ed._tapSystemBound = true;
      }
    });
  }, 2000);
}
