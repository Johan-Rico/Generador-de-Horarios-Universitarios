/* =========================================================
   Planificador de Horarios — lógica de la aplicación
   ========================================================= */

const STORAGE_KEY = 'planificador_materias_v1';

const DIAS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie'];
const DIAS_LABEL = { Lun: 'Lunes', Mar: 'Martes', Mie: 'Miércoles', Jue: 'Jueves', Vie: 'Viernes' };
const DIAS_CORTO = { Lun: 'Lun', Mar: 'Mar', Mie: 'Mié', Jue: 'Jue', Vie: 'Vie' };

// Paleta de colores asignada en orden de creación de cada materia
const PALETTE = [
  '#F7A399', '#FFD27A', '#9ED8B5', '#9FCBE8', '#C9B6E4',
  '#F4A6C6', '#B6D87A', '#F0C48A', '#A8C9E6', '#D9A8E0'
];

const MAX_RESULTS = 300;
const MAX_EXPLORE = 200000;

let materias = [];
let seleccionState = {};      // { materiaId: bool }
let scheduleResults = [];
let currentScheduleIndex = 0;
let currentEdit = { materiaId: null, opcionId: null };

/* ---------------------------------------------------------
   Utilidades
   --------------------------------------------------------- */

function uid(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 9);
}

function timeToMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minToTime(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

function colorForIndex(i) {
  return PALETTE[i % PALETTE.length];
}

function contrastText(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1B2B45' : '#FFFFFF';
}

function formatClase(clase) {
  const dias = clase.dias.map(d => DIAS_CORTO[d]).join(', ');
  const fin = minToTime(timeToMin(clase.horaInicio) + clase.duracion);
  return `${dias}  ${clase.horaInicio}–${fin}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ---------------------------------------------------------
   Persistencia
   --------------------------------------------------------- */

function loadMaterias() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('No se pudo leer el almacenamiento local', e);
    return [];
  }
}

function saveMaterias() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(materias));
}

/* ---------------------------------------------------------
   Render: lista de materias
   --------------------------------------------------------- */

const materiasList = document.getElementById('materiasList');
const emptyMaterias = document.getElementById('emptyMaterias');

function renderMaterias() {
  materiasList.innerHTML = '';

  if (materias.length === 0) {
    emptyMaterias.classList.remove('hidden');
  } else {
    emptyMaterias.classList.add('hidden');
  }

  materias.forEach(materia => {
    const card = document.createElement('div');
    card.className = 'materia-card';
    card.dataset.materiaId = materia.id;

    const codigoHtml = materia.codigo
      ? `<span class="materia-codigo">${escapeHtml(materia.codigo)}</span>`
      : '';

    let opcionesHtml = '';
    if (materia.opciones.length === 0) {
      opcionesHtml = '<p class="no-opciones">Sin opciones todavía. Añade al menos una para poder usar esta materia en los horarios.</p>';
    } else {
      opcionesHtml = '<div class="opciones-list">' + materia.opciones.map(opcion => {
        const profesorHtml = opcion.profesor
          ? `<div class="opcion-profesor">${escapeHtml(opcion.profesor)}</div>`
          : '<div class="opcion-profesor">(sin profesor asignado)</div>';
        const clasesHtml = opcion.clases.map(c => `<div class="opcion-clase">${formatClase(c)}</div>`).join('');
        return `
          <div class="opcion-item">
            ${profesorHtml}
            ${clasesHtml}
            <div class="opcion-actions">
              <button class="btn btn-ghost" data-action="edit-opcion" data-opcion-id="${opcion.id}">Editar</button>
              <button class="btn btn-danger" data-action="del-opcion" data-opcion-id="${opcion.id}">Eliminar</button>
            </div>
          </div>`;
      }).join('') + '</div>';
    }

    card.innerHTML = `
      <div class="materia-head">
        <div class="materia-titulo">
          <span class="color-swatch" style="background:${materia.color}"></span>
          <div>
            <h3>${escapeHtml(materia.nombre)}</h3>
            ${codigoHtml}
          </div>
        </div>
        <button class="btn btn-danger" data-action="del-materia" title="Eliminar materia">✕</button>
      </div>
      <div class="materia-body">
        ${opcionesHtml}
        <button class="btn btn-primary" data-action="add-opcion">+ Añadir opción</button>
      </div>
    `;

    materiasList.appendChild(card);
  });
}

/* ---------------------------------------------------------
   Materias: alta y acciones (delegación de eventos)
   --------------------------------------------------------- */

document.getElementById('formMateria').addEventListener('submit', e => {
  e.preventDefault();
  const nombreInput = document.getElementById('materiaNombre');
  const codigoInput = document.getElementById('materiaCodigo');

  const nombre = nombreInput.value.trim();
  const codigo = codigoInput.value.trim();
  if (!nombre) return;

  materias.push({
    id: uid('mat'),
    nombre,
    codigo: codigo || null,
    color: colorForIndex(materias.length),
    opciones: []
  });

  saveMaterias();
  renderMaterias();
  renderSeleccionMaterias();

  nombreInput.value = '';
  codigoInput.value = '';
  nombreInput.focus();
});

materiasList.addEventListener('click', e => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const card = btn.closest('.materia-card');
  const materiaId = card.dataset.materiaId;
  const action = btn.dataset.action;

  if (action === 'del-materia') {
    if (!confirm('¿Eliminar esta materia y todas sus opciones?')) return;
    materias = materias.filter(m => m.id !== materiaId);
    delete seleccionState[materiaId];
    saveMaterias();
    renderMaterias();
    renderSeleccionMaterias();
  }

  if (action === 'add-opcion') {
    openOpcionModal(materiaId, null);
  }

  if (action === 'edit-opcion') {
    openOpcionModal(materiaId, btn.dataset.opcionId);
  }

  if (action === 'del-opcion') {
    if (!confirm('¿Eliminar esta opción?')) return;
    const materia = materias.find(m => m.id === materiaId);
    materia.opciones = materia.opciones.filter(o => o.id !== btn.dataset.opcionId);
    saveMaterias();
    renderMaterias();
    renderSeleccionMaterias();
  }
});

/* ---------------------------------------------------------
   Modal de opción (añadir / editar)
   --------------------------------------------------------- */

const modalOpcion = document.getElementById('modalOpcion');
const formOpcion = document.getElementById('formOpcion');
const clasesContainer = document.getElementById('clasesContainer');
const claseRowTemplate = document.getElementById('claseRowTemplate');
const modalOpcionTitulo = document.getElementById('modalOpcionTitulo');

function openOpcionModal(materiaId, opcionId) {
  currentEdit = { materiaId, opcionId };
  const materia = materias.find(m => m.id === materiaId);

  clasesContainer.innerHTML = '';
  document.getElementById('opcionProfesor').value = '';

  if (opcionId) {
    const opcion = materia.opciones.find(o => o.id === opcionId);
    modalOpcionTitulo.textContent = `Editar opción — ${materia.nombre}`;
    document.getElementById('opcionProfesor').value = opcion.profesor || '';
    opcion.clases.forEach(c => addClaseRow(c));
  } else {
    modalOpcionTitulo.textContent = `Nueva opción — ${materia.nombre}`;
    addClaseRow();
  }

  modalOpcion.classList.remove('hidden');
}

function closeOpcionModal() {
  modalOpcion.classList.add('hidden');
  currentEdit = { materiaId: null, opcionId: null };
}

function addClaseRow(claseData) {
  const fragment = claseRowTemplate.content.cloneNode(true);
  const row = fragment.querySelector('.clase-row');

  if (claseData) {
    claseData.dias.forEach(dia => {
      const cb = row.querySelector(`input[value="${dia}"]`);
      if (cb) cb.checked = true;
    });
    row.querySelector('.clase-hora').value = claseData.horaInicio;
    row.querySelector('.clase-duracion').value = claseData.duracion;
  }

  row.querySelector('.btn-remove-clase').addEventListener('click', () => {
    if (clasesContainer.children.length > 1) {
      row.remove();
    } else {
      alert('Una opción debe tener al menos una clase.');
    }
  });

  clasesContainer.appendChild(row);
}

document.getElementById('btnAddClase').addEventListener('click', () => addClaseRow());
document.getElementById('btnCloseModal').addEventListener('click', closeOpcionModal);
document.getElementById('btnCancelOpcion').addEventListener('click', closeOpcionModal);
modalOpcion.addEventListener('click', e => {
  if (e.target === modalOpcion) closeOpcionModal();
});

formOpcion.addEventListener('submit', e => {
  e.preventDefault();

  const profesor = document.getElementById('opcionProfesor').value.trim();
  const rows = [...clasesContainer.querySelectorAll('.clase-row')];
  const clases = [];

  for (const row of rows) {
    const dias = [...row.querySelectorAll('.dia-chip input:checked')].map(cb => cb.value);
    const hora = row.querySelector('.clase-hora').value;
    const duracion = parseInt(row.querySelector('.clase-duracion').value, 10);

    if (dias.length === 0) {
      alert('Cada clase debe tener al menos un día seleccionado.');
      return;
    }
    if (!hora) {
      alert('Cada clase debe tener una hora de inicio.');
      return;
    }
    if (!duracion || duracion <= 0 || duracion % 30 !== 0) {
      alert('La duración debe ser un múltiplo de 30 minutos (30, 60, 90...).');
      return;
    }

    clases.push({ dias, horaInicio: hora, duracion });
  }

  const materia = materias.find(m => m.id === currentEdit.materiaId);

  if (currentEdit.opcionId) {
    const opcion = materia.opciones.find(o => o.id === currentEdit.opcionId);
    opcion.profesor = profesor || null;
    opcion.clases = clases;
  } else {
    materia.opciones.push({
      id: uid('op'),
      profesor: profesor || null,
      clases
    });
  }

  saveMaterias();
  renderMaterias();
  renderSeleccionMaterias();
  closeOpcionModal();
});

/* ---------------------------------------------------------
   Exportar / Importar JSON
   --------------------------------------------------------- */

document.getElementById('btnExport').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(materias, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'materias.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

document.getElementById('inputImport').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error('Formato inválido');
      const reemplazar = materias.length === 0 || confirm(
        'Esto reemplazará todas las materias guardadas actualmente. ¿Continuar?'
      );
      if (!reemplazar) return;
      materias = data;
      seleccionState = {};
      saveMaterias();
      renderMaterias();
      renderSeleccionMaterias();
    } catch (err) {
      alert('El archivo no es un JSON válido de materias.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

/* ---------------------------------------------------------
   Pestañas
   --------------------------------------------------------- */

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');

    if (tab.dataset.tab === 'horarios') {
      renderSeleccionMaterias();
    }
  });
});

/* ---------------------------------------------------------
   Selección de materias para generar horarios
   --------------------------------------------------------- */

const seleccionMateriasEl = document.getElementById('seleccionMaterias');

function renderSeleccionMaterias() {
  seleccionMateriasEl.innerHTML = '';

  if (materias.length === 0) {
    seleccionMateriasEl.innerHTML = '<p class="no-opciones">Aún no hay materias creadas.</p>';
    return;
  }

  materias.forEach(materia => {
    const sinOpciones = materia.opciones.length === 0;
    if (!(materia.id in seleccionState)) {
      seleccionState[materia.id] = !sinOpciones;
    }

    const item = document.createElement('label');
    item.className = 'seleccion-item' + (sinOpciones ? ' disabled' : '');
    item.innerHTML = `
      <input type="checkbox" data-materia-id="${materia.id}" ${sinOpciones ? 'disabled' : ''} ${seleccionState[materia.id] && !sinOpciones ? 'checked' : ''}>
      <span class="color-swatch" style="background:${materia.color}"></span>
      <span>${escapeHtml(materia.nombre)}${materia.codigo ? ' (' + escapeHtml(materia.codigo) + ')' : ''}${sinOpciones ? ' — sin opciones' : ''}</span>
    `;
    seleccionMateriasEl.appendChild(item);
  });

  seleccionMateriasEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      seleccionState[cb.dataset.materiaId] = cb.checked;
    });
  });
}

/* ---------------------------------------------------------
   Generación de horarios
   --------------------------------------------------------- */

function clasesOverlap(a, b) {
  const compartenDia = a.dias.some(d => b.dias.includes(d));
  if (!compartenDia) return false;
  const inicioA = timeToMin(a.horaInicio);
  const finA = inicioA + a.duracion;
  const inicioB = timeToMin(b.horaInicio);
  const finB = inicioB + b.duracion;
  return inicioA < finB && inicioB < finA;
}

function getFiltros() {
  const desde = document.getElementById('filtroDesde').value;
  const hasta = document.getElementById('filtroHasta').value;
  const preferidosRaw = document.getElementById('filtroPreferidos').value;
  const evitarRaw = document.getElementById('filtroEvitar').value;

  const parseLista = raw => raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  return {
    desdeMin: desde ? timeToMin(desde) : null,
    hastaMin: hasta ? timeToMin(hasta) : null,
    preferidos: new Set(parseLista(preferidosRaw)),
    evitar: new Set(parseLista(evitarRaw))
  };
}

function passesHardFilters(combo, filtros) {
  for (const { opcion } of combo) {
    const profesor = (opcion.profesor || '').trim().toLowerCase();
    if (profesor && filtros.evitar.has(profesor)) return false;

    for (const clase of opcion.clases) {
      const inicio = timeToMin(clase.horaInicio);
      const fin = inicio + clase.duracion;
      if (filtros.desdeMin !== null && inicio < filtros.desdeMin) return false;
      if (filtros.hastaMin !== null && fin > filtros.hastaMin) return false;
    }
  }
  return true;
}

function scoreCombo(combo, filtros) {
  let score = 0;
  for (const { opcion } of combo) {
    const profesor = (opcion.profesor || '').trim().toLowerCase();
    if (profesor && filtros.preferidos.has(profesor)) score++;
  }
  return score;
}

function generateSchedules() {
  const filtros = getFiltros();
  const seleccionadas = materias.filter(m => seleccionState[m.id] && m.opciones.length > 0);

  scheduleResults = [];
  currentScheduleIndex = 0;

  const resultadoInfo = document.getElementById('resultadoInfo');

  if (seleccionadas.length === 0) {
    resultadoInfo.textContent = 'Selecciona al menos una materia que tenga opciones creadas.';
    renderCurrentSchedule();
    return;
  }

  const results = [];
  let explored = 0;
  let truncated = false;

  function backtrack(idx, combo, clasesAcumuladas) {
    if (results.length >= MAX_RESULTS || truncated) return;
    if (idx === seleccionadas.length) {
      if (passesHardFilters(combo, filtros)) {
        results.push(combo.slice());
      }
      return;
    }
    const materia = seleccionadas[idx];
    for (const opcion of materia.opciones) {
      explored++;
      if (explored > MAX_EXPLORE) { truncated = true; return; }

      let conflicto = false;
      for (const clase of opcion.clases) {
        for (const previa of clasesAcumuladas) {
          if (clasesOverlap(clase, previa)) { conflicto = true; break; }
        }
        if (conflicto) break;
      }
      if (conflicto) continue;

      combo.push({ materia, opcion });
      backtrack(idx + 1, combo, clasesAcumuladas.concat(opcion.clases));
      combo.pop();

      if (results.length >= MAX_RESULTS || truncated) return;
    }
  }

  backtrack(0, [], []);

  results.sort((a, b) => scoreCombo(b, filtros) - scoreCombo(a, filtros));
  scheduleResults = results;

  if (results.length === 0) {
    resultadoInfo.textContent = 'No se encontraron horarios sin conflictos con los filtros actuales. Intenta relajar los filtros o revisa las opciones de las materias.';
  } else {
    let texto = `${results.length} horario${results.length === 1 ? '' : 's'} posible${results.length === 1 ? '' : 's'} encontrado${results.length === 1 ? '' : 's'}.`;
    if (results.length >= MAX_RESULTS || truncated) {
      texto += ' (Se limitó la búsqueda; afina los filtros para reducir las combinaciones.)';
    }
    resultadoInfo.textContent = texto;
  }

  renderCurrentSchedule();
}

document.getElementById('btnGenerar').addEventListener('click', generateSchedules);

/* ---------------------------------------------------------
   Render de la cuadrícula de horario
   --------------------------------------------------------- */

const gridHorario = document.getElementById('gridHorario');
const contadorHorarios = document.getElementById('contadorHorarios');
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');

btnPrev.addEventListener('click', () => {
  if (currentScheduleIndex > 0) {
    currentScheduleIndex--;
    renderCurrentSchedule();
  }
});

btnNext.addEventListener('click', () => {
  if (currentScheduleIndex < scheduleResults.length - 1) {
    currentScheduleIndex++;
    renderCurrentSchedule();
  }
});

function renderCurrentSchedule() {
  if (scheduleResults.length === 0) {
    contadorHorarios.textContent = '—';
    btnPrev.disabled = true;
    btnNext.disabled = true;
    gridHorario.innerHTML = '<p class="empty-hint">No hay horarios para mostrar. Selecciona materias y pulsa «Generar horarios».</p>';
    return;
  }

  contadorHorarios.textContent = `Horario ${currentScheduleIndex + 1} de ${scheduleResults.length}`;
  btnPrev.disabled = currentScheduleIndex === 0;
  btnNext.disabled = currentScheduleIndex === scheduleResults.length - 1;

  gridHorario.innerHTML = buildScheduleTable(scheduleResults[currentScheduleIndex]);
}

function buildScheduleTable(combo) {
  // Recopilar todas las clases con su contexto (materia, opción)
  const items = [];
  combo.forEach(({ materia, opcion }) => {
    opcion.clases.forEach(clase => {
      items.push({ materia, opcion, clase });
    });
  });

  // Rango de horas a mostrar
  let minMin = Infinity;
  let maxMin = -Infinity;
  items.forEach(({ clase }) => {
    const inicio = timeToMin(clase.horaInicio);
    const fin = inicio + clase.duracion;
    if (inicio < minMin) minMin = inicio;
    if (fin > maxMin) maxMin = fin;
  });

  if (!isFinite(minMin)) {
    minMin = 7 * 60;
    maxMin = 19 * 60;
  }

  // Redondear a la hora completa
  minMin = Math.floor(minMin / 60) * 60;
  maxMin = Math.ceil(maxMin / 60) * 60;

  const totalFilas = (maxMin - minMin) / 30;

  // grid[fila][diaIndex] = null | 'ocupada' | { item, span }
  const grid = Array.from({ length: totalFilas }, () => Array(DIAS.length).fill(null));

  items.forEach(item => {
    const inicio = timeToMin(item.clase.horaInicio);
    const filaInicio = (inicio - minMin) / 30;
    const span = item.clase.duracion / 30;

    item.clase.dias.forEach(dia => {
      const diaIndex = DIAS.indexOf(dia);
      if (diaIndex === -1) return;
      grid[filaInicio][diaIndex] = { item, span };
      for (let k = 1; k < span; k++) {
        if (grid[filaInicio + k]) grid[filaInicio + k][diaIndex] = 'ocupada';
      }
    });
  });

  let html = '<table class="horario"><thead><tr><th class="th-hora">Hora</th>';
  DIAS.forEach(dia => {
    html += `<th>${DIAS_LABEL[dia]}</th>`;
  });
  html += '</tr></thead><tbody>';

  for (let fila = 0; fila < totalFilas; fila++) {
    html += `<tr><td class="celda-hora">${minToTime(minMin + fila * 30)}</td>`;
    for (let d = 0; d < DIAS.length; d++) {
      const cell = grid[fila][d];
      if (cell === 'ocupada') continue; // celda cubierta por rowspan anterior
      if (cell === null) {
        html += '<td class="celda-vacia"></td>';
        continue;
      }
      const { item, span } = cell;
      const bg = item.materia.color;
      const fg = contrastText(bg);
      const codigoHtml = item.materia.codigo ? `<span class="cc-codigo">${escapeHtml(item.materia.codigo)}</span>` : '';
      const profHtml = item.opcion.profesor ? `<span class="cc-profesor">${escapeHtml(item.opcion.profesor)}</span>` : '';
      html += `<td class="celda-clase" rowspan="${span}" style="background:${bg}; color:${fg};">
        <span class="cc-nombre">${escapeHtml(item.materia.nombre)}</span>
        ${codigoHtml}
        ${profHtml}
      </td>`;
    }
    html += '</tr>';
  }

  html += '</tbody></table>';
  return html;
}

/* ---------------------------------------------------------
   Inicialización
   --------------------------------------------------------- */

materias = loadMaterias();
renderMaterias();
renderSeleccionMaterias();
