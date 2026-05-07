// =============================================================================
// Historia Clínica Nutricional - Lógica del frontend
// =============================================================================

// ---------- Validación de configuración ----------
if (!window.HC_CONFIG || window.HC_CONFIG.SUPABASE_URL === "PEGAR_AQUI_LA_URL") {
  document.getElementById("loading").innerHTML = `
    <div class="max-w-md text-center p-6">
      <h2 class="text-xl font-bold text-red-600 mb-3">Falta configurar Supabase</h2>
      <p class="text-slate-700 text-sm">
        Editá el archivo <code class="bg-slate-100 px-1">config.js</code> y pegá la URL
        y la clave anon de tu proyecto de Supabase. Mirá las instrucciones en el README.
      </p>
    </div>`;
  throw new Error("config.js no está completo");
}

// ---------- Cliente Supabase ----------
const sb = supabase.createClient(
  window.HC_CONFIG.SUPABASE_URL,
  window.HC_CONFIG.SUPABASE_ANON_KEY
);

// ---------- Estado global ----------
let pacienteActual = null;
let usuarioActual = null;

// ---------- Helpers ----------
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const hoy = () => new Date().toISOString().slice(0, 10);
const v = (x) => (x === null || x === undefined || x === "" ? "—" : x);
const esc = (s) => String(s ?? "").replace(/[<>&"]/g, c =>
  ({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]));

function calcularImc(peso, tallaCm) {
  if (!peso || !tallaCm || tallaCm <= 0) return [null, null];
  const m = tallaCm / 100;
  const imc = Math.round((peso / (m * m)) * 100) / 100;
  let cat;
  if (imc < 18.5) cat = "Bajo peso";
  else if (imc < 25) cat = "Normal";
  else if (imc < 30) cat = "Sobrepeso";
  else if (imc < 35) cat = "Obesidad I";
  else if (imc < 40) cat = "Obesidad II";
  else cat = "Obesidad III";
  return [imc, cat];
}

function calcularEdad(fechaNac) {
  if (!fechaNac) return null;
  const nac = new Date(fechaNac);
  if (isNaN(nac)) return null;
  const h = new Date();
  let edad = h.getFullYear() - nac.getFullYear();
  const m = h.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && h.getDate() < nac.getDate())) edad--;
  return edad;
}

// =============================================================================
// AUTENTICACIÓN
// =============================================================================
async function chequearSesion() {
  const { data } = await sb.auth.getSession();
  if (data.session) {
    usuarioActual = data.session.user;
    mostrarApp();
  } else {
    mostrarLogin();
  }
  $("#loading").classList.add("hidden");
}

function mostrarLogin() {
  $("#vista-login").classList.remove("hidden");
  $("#app").classList.add("hidden");
}

function mostrarApp() {
  $("#vista-login").classList.add("hidden");
  $("#app").classList.remove("hidden");
  $("#usuario-email").textContent = usuarioActual.email;
  cargarPacientes();
}

$("#form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#login-email").value.trim();
  const pass = $("#login-pass").value;
  const errEl = $("#login-error");
  errEl.classList.add("hidden");

  if (!email || !pass) {
    errEl.textContent = "Completá email y contraseña";
    errEl.classList.remove("hidden");
    return;
  }

  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) {
    errEl.textContent = "Credenciales incorrectas o error: " + error.message;
    errEl.classList.remove("hidden");
    return;
  }
  usuarioActual = data.user;
  mostrarApp();
});

$("#btn-logout").addEventListener("click", async () => {
  await sb.auth.signOut();
  usuarioActual = null;
  pacienteActual = null;
  $("#login-email").value = "";
  $("#login-pass").value = "";
  mostrarLogin();
});

$("#btn-mostrar-registro").addEventListener("click", () => {
  $("#reg-email").value = "";
  $("#reg-pass").value = "";
  $("#reg-msg").classList.add("hidden");
  $("#modal-registro").classList.remove("hidden");
});

$("#cancelar-registro").addEventListener("click", () => {
  $("#modal-registro").classList.add("hidden");
});

$("#guardar-registro").addEventListener("click", async () => {
  const email = $("#reg-email").value.trim();
  const pass = $("#reg-pass").value;
  const msgEl = $("#reg-msg");
  msgEl.className = "text-sm";
  msgEl.classList.remove("hidden");

  if (!email || pass.length < 6) {
    msgEl.classList.add("text-red-600");
    msgEl.textContent = "Email obligatorio y contraseña de al menos 6 caracteres";
    return;
  }

  const { error } = await sb.auth.signUp({ email, password: pass });
  if (error) {
    msgEl.classList.add("text-red-600");
    msgEl.textContent = "Error: " + error.message;
    return;
  }
  msgEl.classList.add("text-green-700");
  msgEl.textContent = "Cuenta creada. Si Supabase tiene confirmación de email activa, revisá tu correo. Si no, ya podés iniciar sesión.";
});

// =============================================================================
// LISTA DE PACIENTES
// =============================================================================
async function cargarPacientes() {
  const lista = $("#lista-pacientes");
  lista.innerHTML = '<p class="p-4 text-slate-500">Cargando...</p>';

  const { data, error } = await sb
    .from("pacientes")
    .select("id, nombre, fecha_inicio, fecha_nacimiento, telefono")
    .order("nombre", { ascending: true });

  if (error) {
    lista.innerHTML = `<p class="p-4 text-red-600">Error: ${esc(error.message)}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    lista.innerHTML = '<p class="p-6 text-slate-500 text-center">No hay pacientes cargados todavía. Hacé clic en "+ Nuevo paciente".</p>';
    return;
  }

  const filtro = $("#buscador").value.toLowerCase();
  const filtrados = data.filter(p => p.nombre.toLowerCase().includes(filtro));

  lista.innerHTML = filtrados.map(p => {
    const edad = calcularEdad(p.fecha_nacimiento);
    return `
    <div class="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between" data-id="${p.id}">
      <div>
        <div class="font-medium">${esc(p.nombre)}</div>
        <div class="text-sm text-slate-500">
          ${edad ? edad + " años · " : ""}${esc(p.telefono || "Sin teléfono")}
        </div>
      </div>
      <span class="text-teal-700">→</span>
    </div>`;
  }).join("");

  // Listener de cada fila
  lista.querySelectorAll("[data-id]").forEach(el => {
    el.addEventListener("click", () => abrirPaciente(parseInt(el.dataset.id)));
  });
}

$("#buscador").addEventListener("input", cargarPacientes);

// =============================================================================
// CREAR / ABRIR / ELIMINAR PACIENTE
// =============================================================================
$("#btn-nuevo").addEventListener("click", () => {
  $("#nuevo-nombre").value = "";
  $("#nuevo-fecha-inicio").value = hoy();
  $("#modal-nuevo").classList.remove("hidden");
});

$("#cancelar-nuevo").addEventListener("click", () =>
  $("#modal-nuevo").classList.add("hidden"));

$("#guardar-nuevo").addEventListener("click", async () => {
  const nombre = $("#nuevo-nombre").value.trim();
  if (!nombre) { alert("El nombre es obligatorio"); return; }

  const { data, error } = await sb.from("pacientes").insert({
    nombre,
    fecha_inicio: $("#nuevo-fecha-inicio").value || null,
    creado_por: usuarioActual.id,
  }).select("id").single();

  if (error) { alert("Error: " + error.message); return; }
  $("#modal-nuevo").classList.add("hidden");
  abrirPaciente(data.id);
});

async function abrirPaciente(id) {
  const [pacRes, antRes, labRes, diaRes, selRes, planRes] = await Promise.all([
    sb.from("pacientes").select("*").eq("id", id).single(),
    sb.from("antropometria").select("*").eq("paciente_id", id).order("fecha", { ascending: false }),
    sb.from("laboratorio").select("*").eq("paciente_id", id).order("fecha", { ascending: false }),
    sb.from("dia_alimentario").select("*").eq("paciente_id", id).order("fecha", { ascending: false }),
    sb.from("seleccion_alimentos").select("*").eq("paciente_id", id).order("fecha", { ascending: false }),
    sb.from("planes_alimentarios").select("*").eq("paciente_id", id).order("fecha", { ascending: false }),
  ]);

  if (pacRes.error) { alert("Error: " + pacRes.error.message); return; }

  pacienteActual = pacRes.data;
  pacienteActual.edad = calcularEdad(pacienteActual.fecha_nacimiento);
  pacienteActual.antropometria = antRes.data || [];
  pacienteActual.laboratorio = labRes.data || [];
  pacienteActual.dia_alimentario = diaRes.data || [];
  pacienteActual.seleccion_alimentos = selRes.data || [];
  pacienteActual.planes = planRes.data || [];

  $("#vista-lista").classList.add("hidden");
  $("#vista-ficha").classList.remove("hidden");
  $("#ficha-nombre").textContent = pacienteActual.nombre;
  const partes = [];
  if (pacienteActual.edad) partes.push(pacienteActual.edad + " años");
  if (pacienteActual.sexo) partes.push(pacienteActual.sexo);
  if (pacienteActual.fecha_inicio) partes.push("Inicio: " + pacienteActual.fecha_inicio);
  $("#ficha-resumen").textContent = partes.join(" · ");
  cambiarTab("datos");
}

$("#btn-volver").addEventListener("click", () => {
  $("#vista-ficha").classList.add("hidden");
  $("#vista-lista").classList.remove("hidden");
  pacienteActual = null;
  cargarPacientes();
});

$("#btn-eliminar-paciente").addEventListener("click", async () => {
  if (!confirm(`¿Eliminar a ${pacienteActual.nombre} y TODOS sus registros? Esta acción no se puede deshacer.`)) return;
  const { error } = await sb.from("pacientes").delete().eq("id", pacienteActual.id);
  if (error) { alert("Error: " + error.message); return; }
  $("#btn-volver").click();
});

$("#btn-exportar-hc").addEventListener("click", () => exportarHistoriaCompleta(pacienteActual));

// =============================================================================
// TABS
// =============================================================================
function cambiarTab(tab) {
  $$(".tab-btn").forEach(b => b.classList.toggle("tab-active", b.dataset.tab === tab));
  $$(".tab-content").forEach(c => c.classList.add("hidden"));
  $(`#tab-${tab}`).classList.remove("hidden");
  const r = {
    datos: renderDatos, antropo: renderAntropo, lab: renderLab,
    dia: renderDia, seleccion: renderSeleccion, planes: renderPlanes, stats: renderStats,
  };
  r[tab]();
}
$$(".tab-btn").forEach(b => b.addEventListener("click", () => cambiarTab(b.dataset.tab)));

async function recargarPaciente() {
  await abrirPaciente(pacienteActual.id);
}

// =============================================================================
// TAB: Datos personales
// =============================================================================
function renderDatos() {
  const p = pacienteActual;
  const f = (id, label, value, type = "text") => `
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">${label}</label>
      <input id="${id}" type="${type}" value="${esc(value || "")}" class="border rounded px-3 py-2 w-full" />
    </div>`;
  const ta = (id, label, value) => `
    <div class="md:col-span-2">
      <label class="block text-sm font-medium text-slate-700 mb-1">${label}</label>
      <textarea id="${id}" rows="2" class="border rounded px-3 py-2 w-full">${esc(value || "")}</textarea>
    </div>`;
  $("#tab-datos").innerHTML = `
    <h3 class="text-lg font-bold mb-4">Datos personales y antecedentes</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${f("d-nombre", "Nombre y apellido *", p.nombre)}
      ${f("d-fecha-inicio", "Fecha de inicio", p.fecha_inicio, "date")}
      ${f("d-fecha-nac", "Fecha de nacimiento", p.fecha_nacimiento, "date")}
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Sexo</label>
        <select id="d-sexo" class="border rounded px-3 py-2 w-full">
          <option value="">—</option>
          <option ${p.sexo === "Femenino" ? "selected" : ""}>Femenino</option>
          <option ${p.sexo === "Masculino" ? "selected" : ""}>Masculino</option>
          <option ${p.sexo === "Otro" ? "selected" : ""}>Otro</option>
        </select>
      </div>
      ${f("d-domicilio", "Domicilio", p.domicilio)}
      ${f("d-telefono", "Teléfono / celular", p.telefono)}
      ${f("d-profesion", "Profesión", p.profesion)}
      ${f("d-presion", "Presión arterial", p.presion_arterial)}
    </div>
    <h4 class="text-md font-bold mt-6 mb-3">Antecedentes patológicos</h4>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${ta("d-motivo", "Motivo de consulta", p.motivo_consulta)}
      ${ta("d-operaciones", "Operaciones", p.operaciones)}
      ${ta("d-medicamentos", "Medicamentos", p.medicamentos)}
      ${ta("d-intolerancia", "Intolerancia alimentaria", p.intolerancia_alimentaria)}
      ${ta("d-alergia", "Alergia alimentaria", p.alergia_alimentaria)}
      ${ta("d-pat-gas", "Patologías gástricas", p.patologias_gastricas)}
      ${ta("d-pat-int", "Patologías intestinales", p.patologias_intestinales)}
      ${ta("d-otras", "Otras", p.otras)}
    </div>
    <div class="mt-6 flex gap-2">
      <button id="d-guardar" class="bg-teal-700 text-white px-4 py-2 rounded hover:bg-teal-800">Guardar cambios</button>
      <span id="d-estado" class="self-center text-sm text-green-700"></span>
    </div>`;

  $("#d-guardar").addEventListener("click", async () => {
    const body = {
      nombre: $("#d-nombre").value.trim(),
      fecha_inicio: $("#d-fecha-inicio").value || null,
      fecha_nacimiento: $("#d-fecha-nac").value || null,
      sexo: $("#d-sexo").value || null,
      domicilio: $("#d-domicilio").value || null,
      telefono: $("#d-telefono").value || null,
      profesion: $("#d-profesion").value || null,
      motivo_consulta: $("#d-motivo").value || null,
      operaciones: $("#d-operaciones").value || null,
      medicamentos: $("#d-medicamentos").value || null,
      presion_arterial: $("#d-presion").value || null,
      intolerancia_alimentaria: $("#d-intolerancia").value || null,
      alergia_alimentaria: $("#d-alergia").value || null,
      patologias_gastricas: $("#d-pat-gas").value || null,
      patologias_intestinales: $("#d-pat-int").value || null,
      otras: $("#d-otras").value || null,
    };
    if (!body.nombre) { alert("El nombre es obligatorio"); return; }

    const { error } = await sb.from("pacientes").update(body).eq("id", pacienteActual.id);
    if (error) { alert("Error: " + error.message); return; }

    Object.assign(pacienteActual, body);
    pacienteActual.edad = calcularEdad(body.fecha_nacimiento);
    $("#ficha-nombre").textContent = pacienteActual.nombre;
    $("#d-estado").textContent = "✓ Guardado";
    setTimeout(() => $("#d-estado").textContent = "", 2000);
  });
}

// =============================================================================
// TAB: Antropometría
// =============================================================================
function renderAntropo() {
  const filas = pacienteActual.antropometria.map(a => `
    <tr class="border-b">
      <td class="p-2">${a.fecha}</td>
      <td class="p-2">${v(a.peso)}</td>
      <td class="p-2">${v(a.talla)}</td>
      <td class="p-2">${v(a.peso_ideal)}</td>
      <td class="p-2 font-medium">${v(a.imc)}</td>
      <td class="p-2"><span class="px-2 py-1 rounded text-xs bg-slate-100">${v(a.categoria_imc)}</span></td>
      <td class="p-2 text-sm text-slate-600">${esc(a.observaciones || "—")}</td>
      <td class="p-2"><button data-del-id="${a.id}" data-tabla="antropometria" class="btn-del text-red-600 text-sm">Eliminar</button></td>
    </tr>`).join("");

  $("#tab-antropo").innerHTML = `
    <h3 class="text-lg font-bold mb-4">Valoración antropométrica</h3>
    <details class="mb-6 bg-slate-50 rounded p-4" open>
      <summary class="font-medium">+ Nueva medición</summary>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
        <div><label class="block text-sm mb-1">Fecha</label>
          <input id="a-fecha" type="date" value="${hoy()}" class="border rounded px-2 py-1 w-full" /></div>
        <div><label class="block text-sm mb-1">Peso (kg)</label>
          <input id="a-peso" type="number" step="0.1" class="border rounded px-2 py-1 w-full" /></div>
        <div><label class="block text-sm mb-1">Talla (cm)</label>
          <input id="a-talla" type="number" step="0.1" class="border rounded px-2 py-1 w-full" /></div>
        <div><label class="block text-sm mb-1">Peso ideal (kg)</label>
          <input id="a-pi" type="number" step="0.1" class="border rounded px-2 py-1 w-full" /></div>
        <div><label class="block text-sm mb-1">&nbsp;</label>
          <button id="a-guardar" class="bg-teal-700 text-white px-4 py-1 rounded w-full">Agregar</button></div>
        <div class="col-span-2 md:col-span-5">
          <label class="block text-sm mb-1">Observaciones</label>
          <textarea id="a-obs" rows="2" class="border rounded px-2 py-1 w-full"></textarea>
        </div>
      </div>
      <p class="text-xs text-slate-500 mt-2">El IMC y la categoría OMS se calculan automáticamente.</p>
    </details>
    ${pacienteActual.antropometria.length === 0
      ? '<p class="text-slate-500">Sin registros todavía.</p>'
      : `<div class="overflow-x-auto"><table class="w-full text-sm">
          <thead class="bg-slate-100 text-left">
            <tr><th class="p-2">Fecha</th><th class="p-2">Peso</th><th class="p-2">Talla</th>
            <th class="p-2">P. ideal</th><th class="p-2">IMC</th><th class="p-2">Categoría</th>
            <th class="p-2">Obs.</th><th></th></tr>
          </thead>
          <tbody>${filas}</tbody></table></div>`}`;

  $("#a-guardar").addEventListener("click", async () => {
    const peso = parseFloat($("#a-peso").value) || null;
    const talla = parseFloat($("#a-talla").value) || null;
    const [imc, cat] = calcularImc(peso, talla);
    const body = {
      paciente_id: pacienteActual.id,
      fecha: $("#a-fecha").value || hoy(),
      peso, talla,
      peso_ideal: parseFloat($("#a-pi").value) || null,
      imc, categoria_imc: cat,
      observaciones: $("#a-obs").value || null,
      creado_por: usuarioActual.id,
    };
    const { error } = await sb.from("antropometria").insert(body);
    if (error) { alert("Error: " + error.message); return; }
    await recargarPaciente();
  });

  attachDeleteListeners();
}

// =============================================================================
// TAB: Laboratorio
// =============================================================================
function renderLab() {
  const lista = pacienteActual.laboratorio.map(l => `
    <details class="border rounded mb-2">
      <summary class="p-3 bg-slate-50 flex justify-between items-center">
        <span class="font-medium">Estudio del ${l.fecha}</span>
        <button data-del-id="${l.id}" data-tabla="laboratorio" class="btn-del text-red-600 text-sm">Eliminar</button>
      </summary>
      <div class="p-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        <div><b>Colesterol:</b> ${v(l.colesterol)}</div>
        <div><b>LDL:</b> ${v(l.ldl)}</div>
        <div><b>HDL:</b> ${v(l.hdl)}</div>
        <div><b>TG:</b> ${v(l.tg)}</div>
        <div><b>Glucemia:</b> ${v(l.glucemia)}</div>
        <div><b>HGB glic.:</b> ${v(l.hgb_glicosilada)}</div>
        <div><b>Glób. rojos:</b> ${v(l.globulos_rojos)}</div>
        <div><b>Hematocrito:</b> ${v(l.hematocrito)}</div>
        <div><b>Hemoglobina:</b> ${v(l.hemoglobina)}</div>
        <div><b>Glób. blancos:</b> ${v(l.globulos_blancos)}</div>
        ${l.observaciones ? `<div class="col-span-full"><b>Obs.:</b> ${esc(l.observaciones)}</div>` : ""}
      </div>
    </details>`).join("");

  const inputN = (id, label) => `
    <div>
      <label class="block text-sm mb-1">${label}</label>
      <input id="${id}" type="number" step="0.01" class="border rounded px-2 py-1 w-full" />
    </div>`;

  $("#tab-lab").innerHTML = `
    <h3 class="text-lg font-bold mb-4">Datos de laboratorio</h3>
    <details class="mb-6 bg-slate-50 rounded p-4" open>
      <summary class="font-medium">+ Nuevo estudio</summary>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <div><label class="block text-sm mb-1">Fecha</label>
          <input id="l-fecha" type="date" value="${hoy()}" class="border rounded px-2 py-1 w-full" /></div>
        ${inputN("l-col", "Colesterol")}
        ${inputN("l-ldl", "LDL")}
        ${inputN("l-hdl", "HDL")}
        ${inputN("l-tg", "TG")}
        ${inputN("l-glu", "Glucemia")}
        ${inputN("l-hgb", "HGB glicosilada (HbA1c)")}
        ${inputN("l-gr", "Glóbulos rojos")}
        ${inputN("l-hto", "Hematocrito")}
        ${inputN("l-hb", "Hemoglobina")}
        ${inputN("l-gb", "Glóbulos blancos")}
        <div class="col-span-2 md:col-span-4">
          <label class="block text-sm mb-1">Observaciones</label>
          <textarea id="l-obs" rows="2" class="border rounded px-2 py-1 w-full"></textarea>
        </div>
      </div>
      <button id="l-guardar" class="mt-3 bg-teal-700 text-white px-4 py-2 rounded">Agregar estudio</button>
    </details>
    ${pacienteActual.laboratorio.length === 0
      ? '<p class="text-slate-500">Sin registros todavía.</p>' : lista}`;

  $("#l-guardar").addEventListener("click", async () => {
    const body = {
      paciente_id: pacienteActual.id,
      fecha: $("#l-fecha").value || hoy(),
      colesterol: parseFloat($("#l-col").value) || null,
      ldl: parseFloat($("#l-ldl").value) || null,
      hdl: parseFloat($("#l-hdl").value) || null,
      tg: parseFloat($("#l-tg").value) || null,
      glucemia: parseFloat($("#l-glu").value) || null,
      hgb_glicosilada: parseFloat($("#l-hgb").value) || null,
      globulos_rojos: parseFloat($("#l-gr").value) || null,
      hematocrito: parseFloat($("#l-hto").value) || null,
      hemoglobina: parseFloat($("#l-hb").value) || null,
      globulos_blancos: parseFloat($("#l-gb").value) || null,
      observaciones: $("#l-obs").value || null,
      creado_por: usuarioActual.id,
    };
    const { error } = await sb.from("laboratorio").insert(body);
    if (error) { alert("Error: " + error.message); return; }
    await recargarPaciente();
  });

  attachDeleteListeners();
}

// =============================================================================
// TAB: Día alimentario
// =============================================================================
function renderDia() {
  const lista = pacienteActual.dia_alimentario.map(d => `
    <details class="border rounded mb-2">
      <summary class="p-3 bg-slate-50 flex justify-between items-center">
        <span class="font-medium">Día del ${d.fecha}</span>
        <button data-del-id="${d.id}" data-tabla="dia_alimentario" class="btn-del text-red-600 text-sm">Eliminar</button>
      </summary>
      <div class="p-3 space-y-2 text-sm">
        <div><b>Desayuno:</b> ${esc(v(d.desayuno))}</div>
        <div><b>Media mañana:</b> ${esc(v(d.media_manana))}</div>
        <div><b>Almuerzo:</b> ${esc(v(d.almuerzo))}</div>
        <div><b>Media tarde:</b> ${esc(v(d.media_tarde))}</div>
        <div><b>Cena:</b> ${esc(v(d.cena))}</div>
      </div>
    </details>`).join("");

  const ta = (id, label) => `
    <div><label class="block text-sm mb-1">${label}</label>
      <textarea id="${id}" rows="2" class="border rounded px-2 py-1 w-full"></textarea></div>`;

  $("#tab-dia").innerHTML = `
    <h3 class="text-lg font-bold mb-4">Día alimentario (Recordatorio 24hs)</h3>
    <details class="mb-6 bg-slate-50 rounded p-4" open>
      <summary class="font-medium">+ Nuevo registro</summary>
      <div class="grid grid-cols-1 gap-3 mt-4">
        <div><label class="block text-sm mb-1">Fecha</label>
          <input id="da-fecha" type="date" value="${hoy()}" class="border rounded px-2 py-1 w-full md:w-1/3" /></div>
        ${ta("da-des", "Desayuno")}
        ${ta("da-mm", "Media mañana")}
        ${ta("da-alm", "Almuerzo")}
        ${ta("da-mt", "Media tarde")}
        ${ta("da-cena", "Cena")}
      </div>
      <button id="da-guardar" class="mt-3 bg-teal-700 text-white px-4 py-2 rounded">Agregar día</button>
    </details>
    ${pacienteActual.dia_alimentario.length === 0
      ? '<p class="text-slate-500">Sin registros todavía.</p>' : lista}`;

  $("#da-guardar").addEventListener("click", async () => {
    const body = {
      paciente_id: pacienteActual.id,
      fecha: $("#da-fecha").value || hoy(),
      desayuno: $("#da-des").value || null,
      media_manana: $("#da-mm").value || null,
      almuerzo: $("#da-alm").value || null,
      media_tarde: $("#da-mt").value || null,
      cena: $("#da-cena").value || null,
      creado_por: usuarioActual.id,
    };
    const { error } = await sb.from("dia_alimentario").insert(body);
    if (error) { alert("Error: " + error.message); return; }
    await recargarPaciente();
  });

  attachDeleteListeners();
}

// =============================================================================
// TAB: Selección de alimentos
// =============================================================================
function renderSeleccion() {
  const lista = pacienteActual.seleccion_alimentos.map(s => `
    <details class="border rounded mb-2">
      <summary class="p-3 bg-slate-50 flex justify-between items-center">
        <span class="font-medium">Anamnesis del ${s.fecha}</span>
        <button data-del-id="${s.id}" data-tabla="seleccion_alimentos" class="btn-del text-red-600 text-sm">Eliminar</button>
      </summary>
      <div class="p-3 space-y-1 text-sm">
        <div><b>Lácteos:</b> ${esc(v(s.lacteos))}</div>
        <div><b>Legumbres:</b> ${esc(v(s.legumbres))}</div>
        <div><b>Carnes:</b> ${esc(v(s.carnes))}</div>
        <div><b>Cereales:</b> ${esc(v(s.cereales))}</div>
        <div><b>Frutas:</b> ${esc(v(s.frutas))}</div>
        <div><b>Agua:</b> ${esc(v(s.agua))}</div>
        <div><b>Verduras:</b> ${esc(v(s.verduras))}</div>
        <div><b>Bebidas alcohólicas:</b> ${esc(v(s.bebidas_alcoholicas))}</div>
        <div><b>Actividad física:</b> ${esc(v(s.actividad_fisica))}</div>
      </div>
    </details>`).join("");

  const ta = (id, label) => `
    <div><label class="block text-sm mb-1">${label}</label>
      <textarea id="${id}" rows="2" class="border rounded px-2 py-1 w-full"></textarea></div>`;

  $("#tab-seleccion").innerHTML = `
    <h3 class="text-lg font-bold mb-4">Selección de alimentos (anamnesis)</h3>
    <details class="mb-6 bg-slate-50 rounded p-4" open>
      <summary class="font-medium">+ Nueva anamnesis</summary>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        <div class="md:col-span-2">
          <label class="block text-sm mb-1">Fecha</label>
          <input id="s-fecha" type="date" value="${hoy()}" class="border rounded px-2 py-1 w-full md:w-1/3" />
        </div>
        ${ta("s-lacteos", "Lácteos")}
        ${ta("s-legumbres", "Legumbres")}
        ${ta("s-carnes", "Carnes")}
        ${ta("s-cereales", "Cereales")}
        ${ta("s-frutas", "Frutas")}
        ${ta("s-agua", "Agua")}
        ${ta("s-verduras", "Verduras")}
        ${ta("s-alcohol", "Bebidas alcohólicas")}
        ${ta("s-actividad", "Actividad física")}
      </div>
      <button id="s-guardar" class="mt-3 bg-teal-700 text-white px-4 py-2 rounded">Agregar anamnesis</button>
    </details>
    ${pacienteActual.seleccion_alimentos.length === 0
      ? '<p class="text-slate-500">Sin registros todavía.</p>' : lista}`;

  $("#s-guardar").addEventListener("click", async () => {
    const body = {
      paciente_id: pacienteActual.id,
      fecha: $("#s-fecha").value || hoy(),
      lacteos: $("#s-lacteos").value || null,
      legumbres: $("#s-legumbres").value || null,
      carnes: $("#s-carnes").value || null,
      cereales: $("#s-cereales").value || null,
      frutas: $("#s-frutas").value || null,
      agua: $("#s-agua").value || null,
      verduras: $("#s-verduras").value || null,
      bebidas_alcoholicas: $("#s-alcohol").value || null,
      actividad_fisica: $("#s-actividad").value || null,
      creado_por: usuarioActual.id,
    };
    const { error } = await sb.from("seleccion_alimentos").insert(body);
    if (error) { alert("Error: " + error.message); return; }
    await recargarPaciente();
  });

  attachDeleteListeners();
}

// =============================================================================
// TAB: Planes alimentarios
// =============================================================================
function renderPlanes() {
  const lista = pacienteActual.planes.map(pl => `
    <details class="border rounded mb-2" data-plan-id="${pl.id}">
      <summary class="p-3 bg-slate-50 flex justify-between items-center">
        <span class="font-medium">${esc(pl.titulo || "Plan alimentario")} — ${pl.fecha}</span>
        <span class="flex gap-3 text-sm">
          <button data-export-plan="${pl.id}" class="text-blue-600">📄 Exportar</button>
          <button data-del-id="${pl.id}" data-tabla="planes_alimentarios" class="btn-del text-red-600">Eliminar</button>
        </span>
      </summary>
      <div class="p-3 whitespace-pre-wrap text-sm">${esc(pl.contenido)}</div>
    </details>`).join("");

  $("#tab-planes").innerHTML = `
    <h3 class="text-lg font-bold mb-4">Planes alimentarios</h3>
    <details class="mb-6 bg-slate-50 rounded p-4" open>
      <summary class="font-medium">+ Nuevo plan</summary>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        <div><label class="block text-sm mb-1">Fecha</label>
          <input id="pl-fecha" type="date" value="${hoy()}" class="border rounded px-2 py-1 w-full" /></div>
        <div class="md:col-span-2"><label class="block text-sm mb-1">Título (opcional)</label>
          <input id="pl-titulo" type="text" placeholder="Ej: Plan hipocalórico inicial" class="border rounded px-2 py-1 w-full" /></div>
        <div class="md:col-span-3">
          <label class="block text-sm mb-1">Contenido del plan *</label>
          <textarea id="pl-contenido" rows="10" class="border rounded px-2 py-1 w-full" placeholder="Escribí el plan alimentario completo..."></textarea>
        </div>
      </div>
      <button id="pl-guardar" class="mt-3 bg-teal-700 text-white px-4 py-2 rounded">Guardar plan</button>
    </details>
    ${pacienteActual.planes.length === 0
      ? '<p class="text-slate-500">Sin planes todavía.</p>' : lista}`;

  $("#pl-guardar").addEventListener("click", async () => {
    const contenido = $("#pl-contenido").value.trim();
    if (!contenido) { alert("El contenido del plan es obligatorio"); return; }
    const body = {
      paciente_id: pacienteActual.id,
      fecha: $("#pl-fecha").value || hoy(),
      titulo: $("#pl-titulo").value || null,
      contenido,
      creado_por: usuarioActual.id,
    };
    const { error } = await sb.from("planes_alimentarios").insert(body);
    if (error) { alert("Error: " + error.message); return; }
    await recargarPaciente();
  });

  // Botones exportar plan individual
  document.querySelectorAll("[data-export-plan]").forEach(b => {
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const planId = parseInt(b.dataset.exportPlan);
      const plan = pacienteActual.planes.find(p => p.id === planId);
      if (plan) exportarPlanIndividual(pacienteActual, plan);
    });
  });

  attachDeleteListeners();
}

// =============================================================================
// TAB: Estadísticas
// =============================================================================
function renderStats() {
  const a = [...pacienteActual.antropometria].reverse();
  if (a.length === 0) {
    $("#tab-stats").innerHTML = `
      <h3 class="text-lg font-bold mb-4">Evolución</h3>
      <p class="text-slate-500">Cargá mediciones antropométricas para ver la evolución.</p>`;
    return;
  }
  const filas = a.map(r => `
    <tr class="border-b">
      <td class="p-2">${r.fecha}</td>
      <td class="p-2">${v(r.peso)}</td>
      <td class="p-2">${v(r.imc)}</td>
      <td class="p-2 text-sm">${v(r.categoria_imc)}</td>
    </tr>`).join("");

  const pesos = a.filter(r => r.peso).map(r => r.peso);
  let grafico = "";
  if (pesos.length >= 2) {
    const min = Math.min(...pesos), max = Math.max(...pesos);
    const rango = max - min || 1;
    const w = 600, h = 200, pad = 30;
    const puntos = pesos.map((p, i) => {
      const x = pad + (i * (w - 2 * pad)) / (pesos.length - 1);
      const y = h - pad - ((p - min) / rango) * (h - 2 * pad);
      return `${x},${y}`;
    }).join(" ");
    grafico = `
      <svg viewBox="0 0 ${w} ${h}" class="w-full max-w-2xl border rounded bg-white">
        <polyline points="${puntos}" fill="none" stroke="#0d9488" stroke-width="2"/>
        ${pesos.map((p, i) => {
          const x = pad + (i * (w - 2 * pad)) / (pesos.length - 1);
          const y = h - pad - ((p - min) / rango) * (h - 2 * pad);
          return `<circle cx="${x}" cy="${y}" r="3" fill="#0d9488"/>`;
        }).join("")}
        <text x="5" y="15" font-size="11" fill="#666">${max} kg</text>
        <text x="5" y="${h - 5}" font-size="11" fill="#666">${min} kg</text>
      </svg>`;
  }

  $("#tab-stats").innerHTML = `
    <h3 class="text-lg font-bold mb-4">Evolución antropométrica</h3>
    ${grafico ? `<div class="mb-6"><h4 class="font-medium mb-2">Peso (kg)</h4>${grafico}</div>` : ""}
    <div class="overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-slate-100 text-left">
        <tr><th class="p-2">Fecha</th><th class="p-2">Peso</th><th class="p-2">IMC</th><th class="p-2">Categoría</th></tr>
      </thead>
      <tbody>${filas}</tbody>
    </table></div>`;
}

// =============================================================================
// Eliminar registros (delegación)
// =============================================================================
function attachDeleteListeners() {
  document.querySelectorAll(".btn-del").forEach(b => {
    b.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!confirm("¿Eliminar este registro?")) return;
      const tabla = b.dataset.tabla;
      const id = parseInt(b.dataset.delId);
      const { error } = await sb.from(tabla).delete().eq("id", id);
      if (error) { alert("Error: " + error.message); return; }
      await recargarPaciente();
    });
  });
}

// =============================================================================
// EXPORTACIÓN A WORD (desde el navegador con docx-js)
// =============================================================================
function safeFilename(s) {
  return String(s || "archivo")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "archivo";
}

function p(text, opts = {}) {
  return new docx.Paragraph({
    alignment: opts.center ? docx.AlignmentType.CENTER : docx.AlignmentType.LEFT,
    spacing: opts.spacing,
    children: [new docx.TextRun({
      text: String(text ?? ""),
      bold: !!opts.bold,
      size: opts.size || 22, // 11pt = 22 half-points
    })],
  });
}

function pField(label, value) {
  return new docx.Paragraph({
    children: [
      new docx.TextRun({ text: label + ": ", bold: true, size: 22 }),
      new docx.TextRun({ text: (value === null || value === undefined || value === "") ? "—" : String(value), size: 22 }),
    ],
  });
}

function pHeading(text, level = 1) {
  return new docx.Paragraph({
    spacing: { before: 240, after: 120 },
    children: [new docx.TextRun({
      text, bold: true, size: level === 1 ? 28 : 24,
    })],
  });
}

async function exportarHistoriaCompleta(p) {
  const children = [];

  // Título
  children.push(new docx.Paragraph({
    alignment: docx.AlignmentType.CENTER,
    children: [new docx.TextRun({ text: "HISTORIA CLÍNICA", bold: true, size: 32 })],
  }));
  children.push(new docx.Paragraph({
    alignment: docx.AlignmentType.CENTER,
    children: [new docx.TextRun({ text: "Paciente: " + p.nombre, bold: true, size: 24 })],
  }));
  if (p.fecha_inicio) {
    children.push(new docx.Paragraph({
      alignment: docx.AlignmentType.CENTER,
      children: [new docx.TextRun({ text: "Fecha de inicio: " + p.fecha_inicio, size: 22 })],
    }));
  }

  // Datos personales
  children.push(pHeading("DATOS PERSONALES"));
  children.push(pField("Fecha de nacimiento", p.fecha_nacimiento));
  children.push(pField("Edad", p.edad));
  children.push(pField("Sexo", p.sexo));
  children.push(pField("Domicilio", p.domicilio));
  children.push(pField("Teléfono/celular", p.telefono));
  children.push(pField("Profesión", p.profesion));

  // Antecedentes
  children.push(pHeading("ANTECEDENTES PATOLÓGICOS"));
  children.push(pField("Motivo de consulta", p.motivo_consulta));
  children.push(pField("Operaciones", p.operaciones));
  children.push(pField("Medicamentos", p.medicamentos));
  children.push(pField("Presión arterial", p.presion_arterial));
  children.push(pField("Intolerancia alimentaria", p.intolerancia_alimentaria));
  children.push(pField("Alergia alimentaria", p.alergia_alimentaria));
  children.push(pField("Patologías gástricas", p.patologias_gastricas));
  children.push(pField("Patologías intestinales", p.patologias_intestinales));
  children.push(pField("Otras", p.otras));

  // Antropometría
  children.push(pHeading("VALORACIÓN ANTROPOMÉTRICA"));
  if (p.antropometria.length === 0) {
    children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: "Sin registros.", italics: true, size: 22 })] }));
  } else {
    p.antropometria.forEach(a => {
      children.push(pHeading("Medición del " + a.fecha, 2));
      children.push(pField("Peso (kg)", a.peso));
      children.push(pField("Talla (cm)", a.talla));
      children.push(pField("Peso ideal (kg)", a.peso_ideal));
      children.push(pField("IMC", a.imc));
      children.push(pField("Categoría", a.categoria_imc));
      if (a.observaciones) children.push(pField("Observaciones", a.observaciones));
    });
  }

  // Laboratorio
  children.push(pHeading("DATOS DE LABORATORIO"));
  if (p.laboratorio.length === 0) {
    children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: "Sin registros.", italics: true, size: 22 })] }));
  } else {
    p.laboratorio.forEach(l => {
      children.push(pHeading("Estudio del " + l.fecha, 2));
      children.push(pField("Colesterol", l.colesterol));
      children.push(pField("LDL", l.ldl));
      children.push(pField("HDL", l.hdl));
      children.push(pField("TG", l.tg));
      children.push(pField("Glucemia", l.glucemia));
      children.push(pField("HGB glicosilada", l.hgb_glicosilada));
      children.push(pField("Glóbulos rojos", l.globulos_rojos));
      children.push(pField("Hematocrito", l.hematocrito));
      children.push(pField("Hemoglobina", l.hemoglobina));
      children.push(pField("Glóbulos blancos", l.globulos_blancos));
      if (l.observaciones) children.push(pField("Observaciones", l.observaciones));
    });
  }

  // Día alimentario
  children.push(pHeading("DÍA ALIMENTARIO (Recordatorio 24hs)"));
  if (p.dia_alimentario.length === 0) {
    children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: "Sin registros.", italics: true, size: 22 })] }));
  } else {
    p.dia_alimentario.forEach(d => {
      children.push(pHeading("Registro del " + d.fecha, 2));
      children.push(pField("Desayuno", d.desayuno));
      children.push(pField("Media mañana", d.media_manana));
      children.push(pField("Almuerzo", d.almuerzo));
      children.push(pField("Media tarde", d.media_tarde));
      children.push(pField("Cena", d.cena));
    });
  }

  // Selección
  children.push(pHeading("SELECCIÓN DE ALIMENTOS"));
  if (p.seleccion_alimentos.length === 0) {
    children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: "Sin registros.", italics: true, size: 22 })] }));
  } else {
    p.seleccion_alimentos.forEach(s => {
      children.push(pHeading("Anamnesis del " + s.fecha, 2));
      children.push(pField("Lácteos", s.lacteos));
      children.push(pField("Legumbres", s.legumbres));
      children.push(pField("Carnes", s.carnes));
      children.push(pField("Cereales", s.cereales));
      children.push(pField("Frutas", s.frutas));
      children.push(pField("Agua", s.agua));
      children.push(pField("Verduras", s.verduras));
      children.push(pField("Bebidas alcohólicas", s.bebidas_alcoholicas));
      children.push(pField("Actividad física", s.actividad_fisica));
    });
  }

  // Planes
  children.push(pHeading("PLANES ALIMENTARIOS"));
  if (p.planes.length === 0) {
    children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: "Sin registros.", italics: true, size: 22 })] }));
  } else {
    p.planes.forEach(pl => {
      children.push(pHeading((pl.titulo || "Plan alimentario") + " — " + pl.fecha, 2));
      String(pl.contenido || "").split("\n").forEach(linea => {
        children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: linea, size: 22 })] }));
      });
    });
  }

  const doc = new docx.Document({
    styles: { default: { document: { run: { font: "Arial" } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    }],
  });

  const blob = await docx.Packer.toBlob(doc);
  saveAs(blob, "HC_" + safeFilename(p.nombre) + ".docx");
}

async function exportarPlanIndividual(pac, plan) {
  const children = [];
  children.push(new docx.Paragraph({
    alignment: docx.AlignmentType.CENTER,
    children: [new docx.TextRun({ text: "PLAN ALIMENTARIO", bold: true, size: 32 })],
  }));
  children.push(new docx.Paragraph({
    alignment: docx.AlignmentType.CENTER,
    children: [new docx.TextRun({ text: "Paciente: " + pac.nombre, bold: true, size: 24 })],
  }));
  children.push(new docx.Paragraph({
    alignment: docx.AlignmentType.CENTER,
    children: [new docx.TextRun({ text: "Fecha: " + plan.fecha, size: 22 })],
  }));
  if (plan.titulo) {
    children.push(new docx.Paragraph({
      spacing: { before: 240, after: 120 },
      children: [new docx.TextRun({ text: plan.titulo, bold: true, size: 24 })],
    }));
  }
  children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: "" })] }));
  String(plan.contenido || "").split("\n").forEach(linea => {
    children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: linea, size: 22 })] }));
  });

  const doc = new docx.Document({
    styles: { default: { document: { run: { font: "Arial" } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    }],
  });

  const blob = await docx.Packer.toBlob(doc);
  saveAs(blob, "Plan_" + safeFilename(pac.nombre) + "_" + plan.fecha + ".docx");
}

// =============================================================================
// ARRANQUE
// =============================================================================
chequearSesion();
