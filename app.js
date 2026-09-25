const state = { current: 'waiting', idleTimer: null, speechTimer: null, progressTimer: null, recognition: null };
const panels = { waiting: 'waitingPanel', greeting: 'speechPanel', monologue: 'speechPanel', menu: 'menuPanel', detail: 'detailPanel' };
const $ = (id) => document.getElementById(id);
const robot = $('robot');
const robotZone = document.querySelector('.robot-zone');
const admissionUrl = 'https://uxxiportal.uninunez.edu.co/formularioInscripcion/inicio.jsp';

const copy = {
  greeting: () => `¡Hola! Muy buenos ${new Date().getHours() < 12 ? 'días' : 'tardes'}. Te doy la bienvenida a la Corporación Universitaria Rafael Núñez.`,
  monologue: 'Te encuentras en la Facultad de Ingeniería, un espacio donde la creatividad y el rigor técnico se unen para transformar el entorno. Desde nuestros programas de pregrado como Ingeniería de Sistemas y nuestras especializaciones, trabajamos para formar profesionales enfocados en inteligencia artificial, analítica de datos, desarrollo de software e innovación tecnológica. Aquí combinamos la ética, la tecnología y el pensamiento crítico para solucionar los grandes retos de la región y del país. Si tu meta es diseñar el futuro, este es tu lugar.',
  cta: '¿En qué te puedo ayudar hoy? Puedes tocar la pantalla o hablarme para consultar sobre nuestros programas, eventos de la facultad o ubicación de laboratorios.'
};

function setState(next) {
  state.current = next;
  Object.values(panels).forEach((id) => $(id).classList.remove('active'));
  $(panels[next]).classList.add('active');
  const meta = {
    waiting: ['01','MODO DE BIENVENIDA','Sistema en espera'],
    greeting: ['01','SALUDO INICIAL','INGENIO te da la bienvenida'],
    monologue: ['02','FACULTAD DE INGENIERÍA','Presentación institucional'],
    menu: ['03','ATENCIÓN INTERACTIVA','Listo para orientarte'],
    detail: ['03','RESPUESTA DE INGENIO','Consulta activa']
  }[next];
  $('stateNumber').textContent = meta[0]; $('stateName').textContent = meta[1]; $('statusLabel').textContent = meta[2];
  robot.classList.toggle('talking', next === 'greeting' || next === 'monologue');
  if (next === 'menu' || next === 'detail') resetIdleTimer(); else clearTimeout(state.idleTimer);
}

function speak(text, onEnd, {duration = 0} = {}) {
  window.speechSynthesis?.cancel();
  $('speechText').textContent = text;
  if (duration) startProgress(duration);
  if (!('speechSynthesis' in window)) { state.speechTimer = setTimeout(() => onEnd?.(), Math.max(3500, duration)); return; }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-CO'; utterance.rate = .93; utterance.pitch = 1.02; utterance.volume = .88;
  const voices = speechSynthesis.getVoices();
  utterance.voice = voices.find(v => /es[-_](CO|MX|ES)/i.test(v.lang)) || voices.find(v => /^es/i.test(v.lang)) || null;
  utterance.onend = () => onEnd?.(); utterance.onerror = () => onEnd?.();
  speechSynthesis.speak(utterance);
}

function startProgress(duration) {
  clearInterval(state.progressTimer); const bar = $('speechProgress'); const start = Date.now(); bar.style.width = '0%';
  state.progressTimer = setInterval(() => { const pct = Math.min(100,(Date.now()-start)/duration*100); bar.style.width = `${pct}%`; if(pct >= 100) clearInterval(state.progressTimer); }, 120);
  const tags = [...$('keywords').children]; tags.forEach(t=>t.classList.remove('active'));
  tags.forEach((t,i)=>setTimeout(()=>t.classList.add('active'), duration*(.12+i*.19)));
}

function beginExperience() {
  if (state.current !== 'waiting') return;
  $('idleOverlay').classList.remove('visible');
  robot.classList.add('greeting'); setTimeout(()=>robot.classList.remove('greeting'), 1600);
  setState('greeting');
  speak(copy.greeting(), () => {
    if (state.current !== 'greeting') return;
    setState('monologue'); speak(copy.monologue, showMenu, {duration: 39000});
  }, {duration: 6500});
}

function interrupt() {
  if (!['greeting','monologue'].includes(state.current)) return;
  speechSynthesis?.cancel(); clearTimeout(state.speechTimer); clearInterval(state.progressTimer);
  setState('menu'); speak('¡Claro! Dime, ¿qué necesitas?');
}

function showMenu() {
  speechSynthesis?.cancel(); clearInterval(state.progressTimer); setState('menu'); speak(copy.cta);
}

function resetIdleTimer() {
  clearTimeout(state.idleTimer);
  state.idleTimer = setTimeout(() => {
    speak('¡Sigo aquí si me necesitas! Que tengas un excelente día.');
    $('idleOverlay').classList.add('visible');
    setTimeout(resetExperience, 3800);
  }, 30000);
}

function resetExperience() {
  speechSynthesis?.cancel(); clearTimeout(state.idleTimer); setState('waiting');
}

const details = {
  programas: `<div class="detail-card"><span class="kicker">OFERTA ACADÉMICA</span><h2>Ingeniería que transforma</h2><p>Conoce las rutas de formación de la Facultad de Ingeniería en Cartagena.</p><div class="program-list"><div><strong>Ingeniería de Sistemas</strong><br><small>Programa profesional de pregrado</small></div><div><strong>Tecnología en Desarrollo de Sistemas de Información y de Software</strong><br><small>Formación tecnológica</small></div><div><strong>Posgrados y educación continuada</strong><br><small>Consulta la oferta académica vigente</small></div></div><a class="link-button" href="https://www.uninunez.edu.co/pregrados.html" target="_blank" rel="noopener">Ver oferta académica ↗</a></div>`,
  eventos: `<div class="detail-card"><span class="kicker">AGENDA ACADÉMICA</span><h2>Conecta con la facultad</h2><p>Consulta conferencias, talleres, semilleros y actividades institucionales en los canales oficiales de Uninúñez. Para la programación del día, también puedes acercarte a la recepción de la Facultad de Ingeniería.</p><a class="link-button" href="https://www.uninunez.edu.co/" target="_blank" rel="noopener">Ver sitio institucional ↗</a></div>`,
  laboratorios: `<div class="detail-card"><span class="kicker">ORIENTACIÓN EN CAMPUS</span><h2>Laboratorios</h2><p>Los espacios de práctica de sistemas y software están asociados a la Facultad de Ingeniería. Para llegar al laboratorio asignado a tu clase o evento, confirma el bloque y el aula en recepción o con tu docente.</p><div class="program-list"><div><strong>¿Necesitas una ruta exacta?</strong><br><small>Indica el nombre del laboratorio o la actividad al personal de recepción.</small></div></div></div>`,
  admisiones: `<div class="detail-card qr-layout"><div><span class="kicker">INSCRIPCIÓN EN LÍNEA</span><h2>Da el siguiente paso</h2><p>Escanea el código con tu celular para iniciar el proceso oficial de inscripción a Uninúñez.</p><a class="link-button" href="${admissionUrl}" target="_blank" rel="noopener">Abrir inscripción ↗</a></div><div class="qr-box"><img src="assets/qr-inscripcion.png" alt="Código QR para iniciar la inscripción en Uninúñez"></div></div>`
};

function openTopic(topic) {
  $('detailContent').innerHTML = details[topic] || details.programas; setState('detail');
  robot.classList.remove('react-programas','react-eventos','react-laboratorios','react-admisiones');
  void robot.offsetWidth;
  robot.classList.add(`react-${topic}`);
  setTimeout(() => robot.classList.remove(`react-${topic}`), 2400);
  const lines = {programas:'Aquí puedes conocer nuestros programas de Ingeniería.', eventos:'Te ayudo a consultar la agenda de la facultad.', laboratorios:'Te orientaré para encontrar los laboratorios.', admisiones:'Escanea el código QR para iniciar tu inscripción.'};
  speak(lines[topic]);
}

function startListening() {
  resetIdleTimer(); const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) { $('voiceHint').textContent = 'La entrada de voz no está disponible en este navegador. Usa las opciones de la pantalla.'; return; }
  state.recognition?.abort(); const recognition = new Recognition(); state.recognition = recognition;
  recognition.lang = 'es-CO'; recognition.interimResults = false; recognition.maxAlternatives = 1;
  $('micButton').classList.add('listening'); $('micButton').innerHTML = '<span>◉</span> Escuchando…';
  recognition.onresult = e => { const q = e.results[0][0].transcript.toLowerCase(); let topic = /admisi|inscri|aspir|posgrado/.test(q)?'admisiones':/evento|agenda|actividad/.test(q)?'eventos':/laboratorio|salón|aula|ubic/.test(q)?'laboratorios':'programas'; openTopic(topic); };
  recognition.onerror = () => { $('voiceHint').textContent = 'No pude escucharte. Toca una de las opciones para continuar.'; };
  recognition.onend = () => { $('micButton').classList.remove('listening'); $('micButton').innerHTML = '<span>◉</span> Hablar'; };
  recognition.start();
}

function updateClock(){const d=new Date();$('clock').textContent=d.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});$('dateLabel').textContent=d.toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long'});}

$('startButton').addEventListener('click', beginExperience);
$('skipButton').addEventListener('click', interrupt);
$('micButton').addEventListener('click', startListening);
$('backButton').addEventListener('click', showMenu);
$('idleOverlay').addEventListener('click', ()=>{ $('idleOverlay').classList.remove('visible'); resetExperience(); beginExperience(); });
document.querySelectorAll('.menu-card').forEach(b=>b.addEventListener('click',()=>openTopic(b.dataset.topic)));
robotZone.addEventListener('pointermove', e => {
  const box = robotZone.getBoundingClientRect();
  const x = (e.clientX - box.left) / box.width - .5;
  const y = (e.clientY - box.top) / box.height - .5;
  robot.style.setProperty('--look-x', `${x * 8}px`);
  robot.style.setProperty('--look-y', `${y * 5}px`);
  robot.style.setProperty('--look-rotate', `${x * 1.4}deg`);
});
robotZone.addEventListener('pointerleave', () => {
  robot.style.setProperty('--look-x', '0px');
  robot.style.setProperty('--look-y', '0px');
  robot.style.setProperty('--look-rotate', '0deg');
});
setInterval(() => {
  if (state.current === 'waiting' && !robot.classList.contains('greeting')) {
    robot.classList.add('curious');
    setTimeout(() => robot.classList.remove('curious'), 1350);
  }
}, 7600);
document.addEventListener('pointerdown', e=>{ if(['greeting','monologue'].includes(state.current) && !e.target.closest('#skipButton')) interrupt(); else if(['menu','detail'].includes(state.current)) resetIdleTimer(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && state.current==='detail') showMenu(); if(e.key==='Enter' && state.current==='waiting') beginExperience(); resetIdleTimer(); });
updateClock(); setInterval(updateClock,30000); setState('waiting');
