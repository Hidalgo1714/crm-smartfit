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

/***** CARGAR SEDES DINÁMICAMENTE *****/
async function cargarSedes() {
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
}

/***** QUERY CON FILTROS Y PAGINACIÓN *****/
async function buildQuery(conPaginacion = true) {
  let q = supabaseClient.from(TABLE_NAME).select("*", { count: 'exact' }).order(COL_FECHA, { ascending: false });

  if (selectSede.value) q = q.eq(COL_SEDE, selectSede.value);
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
  tablaBody.innerHTML = "<tr><td colspan='13'>Cargando...</td></tr>";
  hints.textContent = "";

  const { data, error, count } = await buildQuery();
  if (error) {
    console.error(error);
    tablaBody.innerHTML = "<tr><td colspan='13'>Error cargando datos</td></tr>";
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
    .from(TABLE_NAME)
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
  const { data, error } = await buildQuery(false); // Sin paginación para exportar todo
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

  XLSX.writeFile(wb, "registros_por_sede.xlsx");
}

/***** EVENTOS *****/
btnAplicar.addEventListener("click", () => {
  paginaActual = 1;
  cargarDatos();
});

btnLimpiar.addEventListener("click", () => {
  selectSede.value = "";
  inputDesde.value = "";
  inputHasta.value = "";
  selectVer.value = "todos";
  paginaActual = 1;
  cargarDatos();
});

btnExportar.addEventListener("click", exportarExcel);

if (btnExportarSheets) {
  btnExportarSheets.addEventListener("click", exportarAGoogleSheets);
} else {
  console.warn("Botón 'Exportar a Google Sheets' no encontrado en el DOM.");
}

if (btnAbrirSheet) {
  btnAbrirSheet.addEventListener("click", abrirGoogleSheet);
} else {
  console.warn("Botón 'Abrir mi Google Sheet' no encontrado en el DOM.");
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
    .from(TABLE_NAME)
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
  // Confirmación doble para evitar eliminaciones accidentales
  const confirmacion1 = confirm(
    `⚠️ ¿Estás seguro de que deseas ELIMINAR el registro de:\n\n"${nombre}"?\n\nEsta acción NO se puede deshacer.`
  );
  
  if (!confirmacion1) return;
  
  // Segunda confirmación
  const confirmacion2 = confirm(
    `🚨 ÚLTIMA CONFIRMACIÓN:\n\n¿Realmente deseas eliminar permanentemente este registro?\n\nEscribe mentalmente "CONFIRMAR" y presiona OK.`
  );
  
  if (!confirmacion2) return;
  
  try {
    console.log("🗑️ Intentando eliminar registro con ID:", id);
    console.log("📋 Usando tabla:", TABLE_NAME);
    
    // Intentar primero con invitados_v
    let resultado = await supabaseClient
      .from(TABLE_NAME)
      .delete()
      .eq("id", id);
    
    console.log("Resultado de eliminación:", resultado);
    
    // Si falla con invitados_v, intentar con invitados
    if (resultado.error) {
      console.log("⚠️ Falló con tabla principal, intentando con 'invitados'...");
      resultado = await supabaseClient
        .from("invitados")
        .delete()
        .eq("id", id);
    }
    
    if (resultado.error) {
      throw resultado.error;
    }
    
    // Verificar si realmente se eliminó algo
    if (resultado.data && resultado.data.length === 0) {
      console.warn("⚠️ La operación no devolvió datos, pero tampoco error");
    }
    
    alert(`✅ Registro de "${nombre}" eliminado exitosamente.`);
    
    // Recargar los datos después de un pequeño delay
    setTimeout(() => {
      cargarDatos();
    }, 500);
    
  } catch (err) {
    console.error("❌ Error completo al eliminar:", err);
    console.error("Detalles del error:", {
      message: err.message,
      details: err.details,
      hint: err.hint,
      code: err.code
    });
    alert(`❌ Error al eliminar el registro: ${err.message}\n\nRevisa la consola para más detalles.`);
  }
}

/***** CONFIGURACIÓN GOOGLE SHEETS - PLAZA FLORA (PRUEBA) *****/
const GOOGLE_SHEETS_CONFIG = {
  "CRM PLAZA FLORA": {
    sheetId: "1uOPb8A1bJ86FdbBZLRtWxJkzw6dEYEeC6YfHDzV1g44",
    sheetName: "GESTION PROSPECTOS",
    webAppUrl: "https://script.google.com/macros/s/AKfycbyjH0jlrcjQTwGWzgCJKzZM_eslIjlk-TCkJkkR5ptPu8miI7SAEjC2VWuvjvRxvTsR/exec"
  }
  // Aquí agregaremos las demás sedes después de probar
};

/***** FUNCIÓN: EXPORTAR A GOOGLE SHEETS *****/

async function exportarAGoogleSheets() {
  const btn = document.getElementById("btn-exportar-sheets");
  if (!btn) {
    alert("❌ Botón de exportar no encontrado. Verifica el HTML.");
    return;
  }

  btn.disabled = true;
  btn.textContent = "⏳ Sincronizando con Google Sheets...";

  try {
    // 1) Sesión
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      alert("❌ Debes estar autenticado para exportar");
      return;
    }
    const userSede = session.user.app_metadata?.sede || "";
    const userRole = session.user.app_metadata?.rol || "";

    // 2) Config de Sheets por sede
    const sedeConfig = GOOGLE_SHEETS_CONFIG[userSede];
    if (!sedeConfig) {
      alert(`❌ No hay Google Sheet configurado para tu sede: ${userSede || "(vacía)"}`);
      return;
    }

    // 3) Obtener DATOS usando los mismos FILTROS del dashboard (y SIN paginación)
    // buildQuery(false) ya aplica: sede, fechas, ver (pendientes/llamados) y desactiva range
    const { data, error } = await buildQuery(false);
    if (error) throw error;
    if (!data || data.length === 0) {
      alert("⚠️ No hay datos para exportar con los filtros actuales");
      return;
    }

    // 4) Mapear al ORDEN EXACTO de tu hoja:
    // A:Unidad, B:Fecha, C:Mes, D:Nombre, E:Mayor de edad,
    // F:Documento, G:Género, H:Teléfono, I:Barrio,
    // J:Referencia, K:Autorización contacto, L:Estado,
    // M:Fecha de contacto, N:Motivación, O:Observaciones.
    const MESES = [
      "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
      "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"
    ];

    const filas = data.map(r => {
      // fecha_d -> "DD/MM/YY" + MES
      let fecha = "", mes = "";
      if (r[COL_FECHA]) {
        const [yyyy, mm, dd] = String(r[COL_FECHA]).split("-");
        if (yyyy && mm && dd) {
          fecha = `${dd}/${mm}/${yyyy.slice(-2)}`;
          mes = MESES[parseInt(mm, 10) - 1] || "";
        }
      }

      return [
        r[COL_SEDE] || "",            // Unidad (A)
        fecha,                        // Fecha (B)
        mes,                          // Mes (C)
        r[COL_NOMBRE] || "",          // Nombre (D)
        r.mayor_edad || "",           // Mayor de edad (E)
        r[COL_DOCUMENTO] || "",       // Documento (F)
        r[COL_GENERO] || "",          // Género (G)
        r[COL_TELEFONO] || "",        // Teléfono (H)
        r[COL_BARRIO]   || "",        // Barrio (I)
        r[COL_REFERENCIA] || "",      // Referencia (J)
        r[COL_AUTORIZACION] || "",    // Autorización contacto (K)
        r[COL_ESTADO] || "",          // Estado (L)
        r[COL_FECHA_CONTACTO] || "",  // Fecha de contacto (M)
        r[COL_MOTIVACION]  || "",     // Motivación (N)
        r[COL_OBS] || ""              // Observaciones (O)
      ].map(x => (x == null ? "" : String(x).trim())); // fuerza strings y evita "undefined"
    });

    // 5) Enviar al WebApp de GAS (sin headers extra → evita preflight)
       
    const payload = {
     sheetId: sedeConfig.sheetId,
      sheetName: sedeConfig.sheetName,
      data: filas,
      action: "append"      // ← ahora APENDEMOS (una debajo de otra)
    };

    const resp = await fetch(sedeConfig.webAppUrl, {
      method: "POST",
      body: JSON.stringify(payload),
      redirect: "follow"
    });

    // Log amigable (la respuesta de GAS a veces no se puede leer)
    try {
      console.log("📥 GAS:", await resp.text());
    } catch (_) {
      console.log("ℹ️ Respuesta no legible (normal en GAS).");
    }

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
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
      alert("❌ Debes estar autenticado");
      return;
    }
    
    const userSede = session.user.app_metadata.sede;
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

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    const userRole = session.user.app_metadata.rol;
    
    if (userRole === 'recepcionista') {
      const btnAnalytics = document.querySelector('a[href="../ANALYTICS/index.html"]');
      if (btnAnalytics) btnAnalytics.style.display = 'none';

      const btnPresentacion = document.querySelector('#btn-presentation');
      if (btnPresentacion) btnPresentacion.style.display = 'none';
    }
  }
});

/***** INIT *****/
cargarSedes();
cargarDatos();
