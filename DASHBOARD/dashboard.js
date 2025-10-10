/***** CONFIG *****/
const supabaseClient = createSupabaseClient();

const TABLE_NAME = "invitados_v";
const COL_FECHA = "fecha_d";
const COL_SEDE = "sede";
const COL_NOMBRE = "nombre";
const COL_DOCUMENTO = "documento";
const COL_GENERO = "genero";
const COL_TELEFONO = "telefono";
const COL_BARRIO = "barrio";
const COL_REFERENCIA = "referencia";
const COL_AUTORIZACION = "autorizacion";
const COL_ESTADO = "estado";
const COL_FECHA_CONTACTO = "fecha_contacto";
const COL_MOTIVACION = "motivacion";
const COL_OBS = "observaciones";
const COL_LLAMADO = "llamado";
let todosLosRegistros = [];

// Variables para paginación
let paginaActual = 1;
const REGISTROS_POR_PAGINA = 50;

// Variables para control de sede por rol
let userRole = null;
let userSede = null;

/***** UI *****/
const elInscritos = document.getElementById("inscritos-count");
const elNoInteresados = document.getElementById("nointeresados-count");
const tablaBody = document.getElementById("tabla-body");
const hints = document.getElementById("hints");

const selectSede = document.getElementById("filtro-sede");
const inputDesde = document.getElementById("filtro-desde");
const inputHasta = document.getElementById("filtro-hasta");
const selectVer = document.getElementById("filtro-ver");

const btnAplicar = document.getElementById("btn-aplicar");
const btnLimpiar = document.getElementById("btn-limpiar");
const btnExportar = document.getElementById("btn-exportar");
const btnExportarSheets = document.getElementById("btn-exportar-sheets");
const btnAbrirSheet = document.getElementById("btn-abrir-sheet");

/***** CHARTS *****/
let chartBar, chartPie;

/***** OBTENER ROL Y SEDE DEL USUARIO *****/
async function obtenerInfoUsuario() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (session) {
    userRole = session.user.app_metadata.rol;
    userSede = session.user.app_metadata.sede;
    
    console.log("👤 Usuario:", { rol: userRole, sede: userSede });
    
    // Si NO es maestro, bloquear el filtro de sede
    if (userRole !== 'maestro') {
      selectSede.disabled = true;
      selectSede.value = userSede;
      selectSede.style.backgroundColor = '#1a1a1a';
      selectSede.style.cursor = 'not-allowed';
      console.log("🔒 Filtro de sede bloqueado para:", userRole);
    }
  }
}

/***** CARGAR SEDES DINÁMICAMENTE *****/
async function cargarSedes() {
  // Si no es maestro, no necesitamos cargar sedes (ya está fija)
  if (userRole !== 'maestro') {
    console.log("ℹ️ No se cargan sedes (usuario no es maestro)");
    return;
  }
  
  const { data, error } = await supabaseClient
    .from(TABLE_NAME)
    .select(COL_SEDE);
  
  if (error) {
    console.error("Error cargando sedes:", error);
    return;
  }

  const sedesUnicas = [...new Set(data.map(r => r[COL_SEDE]).filter(Boolean))];
  sedesUnicas.sort();

  sedesUnicas.forEach(sede => {
    const option = document.createElement("option");
    option.value = sede;
    option.textContent = sede;
    selectSede.appendChild(option);
  });
  
  console.log("✅ Sedes cargadas para maestro");
}

/***** QUERY CON FILTROS Y PAGINACIÓN *****/
async function buildQuery(conPaginacion = true) {
  let q = supabaseClient.from(TABLE_NAME).select("*", { count: 'exact' }).order(COL_FECHA, { ascending: false });

  // 🔒 FILTRO AUTOMÁTICO POR SEDE (si no es maestro)
  if (userRole !== 'maestro' && userSede) {
    q = q.eq(COL_SEDE, userSede);
    console.log("🔒 Filtrando por sede:", userSede);
  }

  // Filtros manuales
  if (selectSede.value && userRole === 'maestro') {
    q = q.eq(COL_SEDE, selectSede.value);
  }
  
  if (inputDesde.value) q = q.gte(COL_FECHA, inputDesde.value);
  if (inputHasta.value) q = q.lte(COL_FECHA, inputHasta.value);

  if (selectVer.value === "pendientes") q = q.eq(COL_LLAMADO, false);
  if (selectVer.value === "llamados") q = q.eq(COL_LLAMADO, true);

  if (conPaginacion) {
    const desde = (paginaActual - 1) * REGISTROS_POR_PAGINA;
    const hasta = desde + REGISTROS_POR_PAGINA - 1;
    q = q.range(desde, hasta);
  }

  return q;
}

/***** CARGAR DATOS CON PAGINACIÓN *****/
async function cargarDatos() {
  tablaBody.innerHTML = "<tr><td colspan='16'>Cargando...</td></tr>";
  hints.textContent = "";

  const { data, error, count } = await buildQuery();
  if (error) {
    console.error(error);
    tablaBody.innerHTML = "<tr><td colspan='16'>Error cargando datos</td></tr>";
    return;
  }

  todosLosRegistros = data || [];

  renderTabla(todosLosRegistros);
  renderizarPaginacion(count);

  const inscritos = data.filter(r => r[COL_ESTADO] === "Inscrito").length;
  const noInteresados = data.filter(r => r[COL_ESTADO] === "No interesado").length;
  elInscritos.textContent = inscritos;
  elNoInteresados.textContent = noInteresados;
}

/***** RENDER TABLA *****/
function renderTabla(registros) {
  tablaBody.innerHTML = "";
  if (!registros || registros.length === 0) {
    tablaBody.innerHTML = "<tr><td colspan='16'>No se encontraron resultados</td></tr>";
    return;
  }

  registros.forEach(row => {
    const tr = document.createElement("tr");
    const estado = (row[COL_ESTADO] || "default").toLowerCase().replace(/\s+/g, '-');
    tr.classList.add(`estado-${estado}`);

    tr.innerHTML = `
      <td>${row[COL_FECHA] || ""}</td>
      <td>${row[COL_SEDE] || ""}</td>
      <td>${row[COL_NOMBRE] || ""}</td>
      <td>${row[COL_DOCUMENTO] || ""}</td>
      <td>${row[COL_GENERO] || ""}</td>
      <td>${row[COL_TELEFONO] || ""}</td>
      <td>${row[COL_BARRIO] || ""}</td>                 
      <td>${row[COL_REFERENCIA] || ""}</td>
      <td>${row[COL_AUTORIZACION] || ""}</td>
      <td>${row[COL_ESTADO] || ""}</td>
      <td>${row[COL_FECHA_CONTACTO] || ""}</td>         
      <td>${row[COL_MOTIVACION] || ""}</td>             
      <td>${row[COL_OBS] || ""}</td>
      <td><input type="checkbox" ${row[COL_LLAMADO] ? "checked" : ""} onchange="marcarLlamado(${row.id}, this.checked)"></td>
      <td><button class="btn-editar" onclick="abrirModalEdicion(${row.id})">✏️ Editar</button></td>
      <td><button class="btn-eliminar" onclick="eliminarRegistro(${row.id}, '${(row[COL_NOMBRE] || '').replace(/'/g, "\\'")}')">🗑️ Eliminar</button></td>
    `;
    tablaBody.appendChild(tr);
  });
}

/***** RENDERIZAR CONTROLES DE PAGINACIÓN *****/
function renderizarPaginacion(totalRegistros) {
  const totalPaginas = Math.ceil(totalRegistros / REGISTROS_POR_PAGINA);
  const paginacionContainer = document.getElementById('paginacion');
  
  if (!paginacionContainer) return;
  
  if (totalPaginas <= 1) {
    paginacionContainer.innerHTML = '';
    return;
  }
  
  let html = '<div class="pagination-controls">';
  html += `<button ${paginaActual === 1 ? 'disabled' : ''} onclick="cambiarPagina(${paginaActual - 1})">← Anterior</button>`;
  html += `<span class="pagination-info">Página ${paginaActual} de ${totalPaginas} (${totalRegistros} registros)</span>`;
  html += `<button ${paginaActual === totalPaginas ? 'disabled' : ''} onclick="cambiarPagina(${paginaActual + 1})">Siguiente →</button>`;
  html += '</div>';
  
  paginacionContainer.innerHTML = html;
}

function cambiarPagina(nuevaPagina) {
  paginaActual = nuevaPagina;
  cargarDatos();
}

/***** MARCAR LLAMADO *****/
async function marcarLlamado(id, value) {
  const { error } = await supabaseClient
    .from("invitados")
    .update({ [COL_LLAMADO]: value })
    .eq("id", id);

  if (error) {
    alert("Error al actualizar");
    console.error(error);
  } else {
    cargarDatos();
  }
}

/***** EXPORTAR A EXCEL (por sede + resumen) *****/
async function exportarExcel() {
  const { data, error } = await buildQuery(false);
  if (error || !data || data.length === 0) {
    alert("No hay datos para exportar");
    return;
  }

  const sedesAgrupadas = data.reduce((acc, row) => {
    const sede = row[COL_SEDE] || "Sin Sede";
    if (!acc[sede]) acc[sede] = [];
    acc[sede].push(row);
    return acc;
  }, {});

  const wb = XLSX.utils.book_new();

  const resumen = [];
  Object.keys(sedesAgrupadas).forEach(sede => {
    const datosSede = sedesAgrupadas[sede];
    resumen.push({
      Sede: sede,
      Total: datosSede.length,
      "En proceso": datosSede.filter(r => r[COL_ESTADO] === "En proceso").length,
      "Inscrito": datosSede.filter(r => r[COL_ESTADO] === "Inscrito").length,
      "Nuevo Lead": datosSede.filter(r => r[COL_ESTADO] === "Nuevo Lead").length,
      "No interesado": datosSede.filter(r => r[COL_ESTADO] === "No interesado").length,
      "Smart otra sede": datosSede.filter(r => r[COL_ESTADO] === "Smart otra sede").length,
      "Day pass": datosSede.filter(r => r[COL_ESTADO] === "Day pass").length,
      "Activación de marca": datosSede.filter(r => r[COL_ESTADO] === "Activación de marca").length,
      "Llamados realizados": datosSede.filter(r => r[COL_LLAMADO]).length
    });
  });
  const hojaResumen = XLSX.utils.json_to_sheet(resumen);
  XLSX.utils.book_append_sheet(wb, hojaResumen, "Resumen");

  Object.keys(sedesAgrupadas).forEach(sede => {
    const hoja = XLSX.utils.json_to_sheet(sedesAgrupadas[sede].map(r => ({
      Fecha: r[COL_FECHA] || "",
      Sede: r[COL_SEDE] || "",
      Nombre: r[COL_NOMBRE] || "",
      Documento: r[COL_DOCUMENTO] || "",
      Genero: r[COL_GENERO] || "",
      Telefono: r[COL_TELEFONO] || "",
      Barrio: r[COL_BARRIO] || "",
      Referencia: r[COL_REFERENCIA] || "",
      Autorizacion: r[COL_AUTORIZACION] || "",
      Estado: r[COL_ESTADO] || "",
      "Fecha de contacto": r[COL_FECHA_CONTACTO] || "",
      Motivacion: r[COL_MOTIVACION] || "",
      Observaciones: r[COL_OBS] || "",
      Llamado: r[COL_LLAMADO] ? "Sí" : "No"
    })));
    XLSX.utils.book_append_sheet(wb, hoja, sede.substring(0, 31));
  });

  const nombreArchivo = userRole === 'maestro' 
    ? "registros_todas_sedes.xlsx"
    : `registros_${userSede}.xlsx`;
  
  XLSX.writeFile(wb, nombreArchivo);
}

/***** EVENTOS *****/
btnAplicar.addEventListener("click", () => {
  paginaActual = 1;
  cargarDatos();
});

btnLimpiar.addEventListener("click", () => {
  // Si no es maestro, mantener la sede bloqueada
  if (userRole === 'maestro') {
    selectSede.value = "";
  }
  inputDesde.value = "";
  inputHasta.value = "";
  selectVer.value = "todos";
  paginaActual = 1;
  cargarDatos();
});

btnExportar.addEventListener("click", exportarExcel);

if (btnExportarSheets) {
  btnExportarSheets.addEventListener("click", exportarAGoogleSheets);
}

if (btnAbrirSheet) {
  btnAbrirSheet.addEventListener("click", abrirGoogleSheet);
}

const inputBuscar = document.getElementById("input-buscar");
inputBuscar.addEventListener("input", () => {
  const termino = inputBuscar.value.toLowerCase().trim();

  if (!termino) {
    renderTabla(todosLosRegistros);
    return;
  }

  const filtrados = todosLosRegistros.filter(registro => {
    const nombre = (registro[COL_NOMBRE] || "").toLowerCase();
    const documento = (registro[COL_DOCUMENTO] || "").toString();
    
    return nombre.includes(termino) || documento.includes(termino);
  });

  renderTabla(filtrados);
});

/***** MODAL DE EDICIÓN *****/
const modal = document.getElementById("modal-editar");
const formEditar = document.getElementById("form-editar");
const elEditId = document.getElementById("edit-id");
const elEditNombre = document.getElementById("edit-nombre");
const elEditEstado = document.getElementById("edit-estado");
const elEditTelefono = document.getElementById("edit-telefono");
const elEditObservaciones = document.getElementById("edit-observaciones");

function abrirModalEdicion(id) {
  const registro = todosLosRegistros.find(r => r.id === id);
  if (!registro) {
    alert("No se encontró el registro.");
    return;
  }

  elEditId.value = registro.id;
  elEditNombre.value = registro[COL_NOMBRE];
  elEditEstado.value = registro[COL_ESTADO];
  elEditTelefono.value = registro[COL_TELEFONO];
  elEditObservaciones.value = registro[COL_OBS];

  modal.style.display = "flex";
}

function cerrarModalEdicion() {
  modal.style.display = "none";
}

formEditar.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = elEditId.value;
  
  const payload = {
    [COL_ESTADO]: elEditEstado.value,
    [COL_TELEFONO]: elEditTelefono.value,
    [COL_OBS]: elEditObservaciones.value
  };

  const { error } = await supabaseClient
    .from("invitados")
    .update(payload)
    .eq("id", id);
  
  if (error) {
    alert("Error al actualizar el registro.");
    console.error(error);
  } else {
    cerrarModalEdicion();
    cargarDatos();
  }
});

document.getElementById("modal-close-btn").addEventListener("click", cerrarModalEdicion);
document.getElementById("btn-cancelar").addEventListener("click", cerrarModalEdicion);
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    cerrarModalEdicion();
  }
});

/***** FUNCIÓN: ELIMINAR REGISTRO *****/
async function eliminarRegistro(id, nombre) {
  const confirmacion1 = confirm(
    `⚠️ ¿Estás seguro de que deseas ELIMINAR el registro de:\n\n"${nombre}"?\n\nEsta acción NO se puede deshacer.`
  );
  
  if (!confirmacion1) return;
  
  const confirmacion2 = confirm(
    `🚨 ÚLTIMA CONFIRMACIÓN:\n\n¿Realmente deseas eliminar permanentemente este registro?\n\nEscribe mentalmente "CONFIRMAR" y presiona OK.`
  );
  
  if (!confirmacion2) return;
  
  try {
    const { error } = await supabaseClient
      .from("invitados")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
    
    alert(`✅ Registro de "${nombre}" eliminado exitosamente.`);
    setTimeout(() => cargarDatos(), 500);
    
  } catch (err) {
    console.error("❌ Error al eliminar:", err);
    alert(`❌ Error al eliminar el registro: ${err.message}`);
  }
}

/***** CONFIGURACIÓN GOOGLE SHEETS *****/
const GOOGLE_SHEETS_CONFIG = {
  "CRM PLAZA FLORA": {
    sheetId: "1uOPb8A1bJ86FdbBZLRtWxJkzw6dEYEeC6YfHDzV1g44",
    sheetName: "GESTION PROSPECTOS",
    webAppUrl: "https://script.google.com/macros/s/AKfycbyjH0jlrcjQTwGWzgCJKzZM_eslIjlk-TCkJkkR5ptPu8miI7SAEjC2VWuvjvRxvTsR/exec"
  }
};

/***** FUNCIÓN: EXPORTAR A GOOGLE SHEETS *****/
async function exportarAGoogleSheets() {
  const btn = document.getElementById("btn-exportar-sheets");
  if (!btn) return;

  btn.disabled = true;
  btn.textContent = "⏳ Sincronizando con Google Sheets...";

  try {
    const sedeConfig = GOOGLE_SHEETS_CONFIG[userSede];
    if (!sedeConfig) {
      alert(`❌ No hay Google Sheet configurado para tu sede: ${userSede || "(vacía)"}`);
      return;
    }

    const { data, error } = await buildQuery(false);
    if (error) throw error;
    if (!data || data.length === 0) {
      alert("⚠️ No hay datos para exportar con los filtros actuales");
      return;
    }

    const MESES = [
      "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
      "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"
    ];

    const filas = data.map(r => {
      let fecha = "", mes = "";
      if (r[COL_FECHA]) {
        const [yyyy, mm, dd] = String(r[COL_FECHA]).split("-");
        if (yyyy && mm && dd) {
          fecha = `${dd}/${mm}/${yyyy.slice(-2)}`;
          mes = MESES[parseInt(mm, 10) - 1] || "";
        }
      }

      return [
        r[COL_SEDE] || "",
        fecha,
        mes,
        r[COL_NOMBRE] || "",
        r.mayor_edad || "",
        r[COL_DOCUMENTO] || "",
        r[COL_GENERO] || "",
        r[COL_TELEFONO] || "",
        r[COL_BARRIO] || "",
        r[COL_REFERENCIA] || "",
        r[COL_AUTORIZACION] || "",
        r[COL_ESTADO] || "",
        r[COL_FECHA_CONTACTO] || "",
        r[COL_MOTIVACION] || "",
        r[COL_OBS] || ""
      ].map(x => (x == null ? "" : String(x).trim()));
    });

    const payload = {
      sheetId: sedeConfig.sheetId,
      sheetName: sedeConfig.sheetName,
      data: filas,
      action: "append"
    };

    const resp = await fetch(sedeConfig.webAppUrl, {
      method: "POST",
      body: JSON.stringify(payload),
      redirect: "follow"
    });

    alert(`✅ Exportado correctamente\n📊 Filas: ${filas.length}\n🏢 Sede: ${userSede}\n📄 Pestaña: ${sedeConfig.sheetName}`);
  } catch (err) {
    console.error("❌ Exportar Sheets:", err);
    alert(`❌ Error al exportar: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = "☁️ Exportar a Google Sheets";
  }
}

/***** FUNCIÓN: ABRIR GOOGLE SHEET *****/
async function abrirGoogleSheet() {
  try {
    const sedeConfig = GOOGLE_SHEETS_CONFIG[userSede];
    
    if (!sedeConfig) {
      alert(`❌ No hay Google Sheet configurado para tu sede: ${userSede}`);
      return;
    }
    
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${sedeConfig.sheetId}/edit`;
    window.open(sheetUrl, '_blank');
    
  } catch (err) {
    console.error("Error:", err);
    alert(`Error al abrir el sheet: ${err.message}`);
  }
}

/***** INICIALIZACIÓN *****/
document.addEventListener('DOMContentLoaded', async () => {
  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        btnLogout.textContent = "Cerrando...";
        await supabaseClient.auth.signOut();
        window.location.href = '../LOGIN/index.html';
      }
    });
  }

  // Obtener info del usuario PRIMERO
  await obtenerInfoUsuario();

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    if (userRole === 'recepcionista') {
      const btnAnalytics = document.querySelector('a[href="../ANALYTICS/index.html"]');
      if (btnAnalytics) btnAnalytics.style.display = 'none';

      const btnPresentacion = document.querySelector('#btn-presentation');
      if (btnPresentacion) btnPresentacion.style.display = 'none';
    }
  }
  
  // Cargar sedes (solo si es maestro)
  await cargarSedes();
  
  // Cargar datos
  await cargarDatos();
});