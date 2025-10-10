/***** CONFIG *****/

const supabaseClient = createSupabaseClient();

// IMPORTANTE: Verifica que este sea el nombre correcto de tu tabla
const TABLE_NAME = "invitados_v"; // Si no funciona, cambia a "invitados"

/***** CHARTS *****/
let charts = {};

/***** CARGAR SEDES DINÁMICAMENTE *****/
async function cargarSedes() {
  console.log("🔄 Cargando sedes...");
  
  try {
    const { data, error } = await supabaseClient
      .from(TABLE_NAME)
      .select("sede");
    
    if (error) {
      console.error("❌ Error cargando sedes:", error);
      // Si falla con invitados_v, intenta con invitados
      const { data: data2, error: error2 } = await supabaseClient
        .from("invitados")
        .select("sede");
      
      if (error2) {
        console.error("❌ Error también con tabla 'invitados':", error2);
        return;
      }
      data = data2;
    }

    console.log("✅ Datos recibidos:", data);

    if (!data || data.length === 0) {
      console.warn("⚠️ No hay datos de sedes");
      return;
    }

    const sedesUnicas = [...new Set(data.map(r => r.sede).filter(Boolean))];
    sedesUnicas.sort();

    console.log("📍 Sedes únicas encontradas:", sedesUnicas);

    const selectSede = document.getElementById("filtro-sede");
    
    if (!selectSede) {
      console.error("❌ No se encontró el elemento 'filtro-sede'");
      return;
    }

    // Limpiar opciones existentes excepto la primera
    while (selectSede.options.length > 1) {
      selectSede.remove(1);
    }

    sedesUnicas.forEach(sede => {
      const option = document.createElement("option");
      option.value = sede;
      option.textContent = sede;
      selectSede.appendChild(option);
    });

    console.log("✅ Sedes cargadas correctamente en el select");
  } catch (err) {
    console.error("❌ Error inesperado:", err);
  }
}

/***** CARGAR DATOS CON FILTROS *****/
async function cargarDatos() {
  console.log("🔄 Cargando datos con filtros...");
  
  const periodo = document.getElementById("periodo").value;
  const sedeSeleccionada = document.getElementById("filtro-sede").value;
  
  console.log("Filtros aplicados:", { periodo, sedeSeleccionada });
  
  let query = supabaseClient.from(TABLE_NAME).select("*");
  
  // Filtro de período
  if (periodo !== "all") {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - parseInt(periodo));
    query = query.gte("fecha_d", fechaLimite.toISOString().slice(0, 10));
  }
  
  // Filtro de sede
  if (sedeSeleccionada) {
    query = query.eq("sede", sedeSeleccionada);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error("❌ Error cargando datos:", error);
    // Intentar con la tabla alternativa
    let query2 = supabaseClient.from("invitados").select("*");
    if (periodo !== "all") {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - parseInt(periodo));
      query2 = query2.gte("fecha_d", fechaLimite.toISOString().slice(0, 10));
    }
    if (sedeSeleccionada) {
      query2 = query2.eq("sede", sedeSeleccionada);
    }
    
    const { data: data2, error: error2 } = await query2;
    if (error2) {
      console.error("❌ Error también con tabla alternativa:", error2);
      return;
    }
    data = data2;
  }
  
  console.log("✅ Datos cargados:", data?.length || 0, "registros");
  
  actualizarKPIs(data);
  renderizarGraficos(data);
}

/***** ACTUALIZAR KPIs *****/
function actualizarKPIs(data) {
  const total = data.length;
  const inscritos = data.filter(r => r.estado === "Inscrito").length;
  const conversion = total > 0 ? ((inscritos / total) * 100).toFixed(1) : 0;
  const llamados = data.filter(r => r.llamado).length;
  
  document.getElementById("kpi-total").textContent = total;
  document.getElementById("kpi-inscritos").textContent = inscritos;
  document.getElementById("kpi-conversion").textContent = conversion + "%";
  document.getElementById("kpi-llamados").textContent = llamados;
}

/***** RENDERIZAR TODOS LOS GRÁFICOS *****/
function renderizarGraficos(data) {
  renderTendencia(data);
  renderTopSedes(data);
  renderGenero(data);
  renderEstadosSede(data);
  renderReferencias(data);
  renderAutorizacion(data);
  renderConversion(data);
  renderSemanal(data);
}

/***** GRÁFICO: TENDENCIA TEMPORAL *****/
function renderTendencia(data) {
  const ctx = document.getElementById("chartTendencia").getContext("2d");
  
  const porFecha = {};
  data.forEach(r => {
    const fecha = r.fecha_d || "Sin fecha";
    porFecha[fecha] = (porFecha[fecha] || 0) + 1;
  });
  
  const fechasOrdenadas = Object.keys(porFecha).sort();
  const valores = fechasOrdenadas.map(f => porFecha[f]);
  
  if (charts.tendencia) charts.tendencia.destroy();
  
  charts.tendencia = new Chart(ctx, {
    type: "line",
    data: {
      labels: fechasOrdenadas,
      datasets: [{
        label: "Registros por día",
        data: valores,
        borderColor: "#FFD700",
        backgroundColor: "rgba(255, 215, 0, 0.1)",
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false }
      }
    }
  });
}

/***** GRÁFICO: TOP 5 SEDES POR INSCRITOS *****/
function renderTopSedes(data) {
  const ctx = document.getElementById("chartTopSedes").getContext("2d");
  
  // Agrupar por sede y contar solo los INSCRITOS
  const porSede = {};
  data.forEach(r => {
    const sede = r.sede || "Sin sede";
    if (r.estado === "Inscrito") {
      porSede[sede] = (porSede[sede] || 0) + 1;
    }
  });
  
  // Ordenar por cantidad de inscritos y tomar el top 5
  const top5 = Object.entries(porSede)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  if (charts.topSedes) charts.topSedes.destroy();
  
  charts.topSedes = new Chart(ctx, {
    type: "bar",
    data: {
      labels: top5.map(s => s[0]),
      datasets: [{
        label: "Inscritos",
        data: top5.map(s => s[1]),
        backgroundColor: ["#FFD700", "#FFA500", "#FF8C00", "#FF7F50", "#FF6347"]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { 
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Inscritos: ${context.parsed.y}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            color: '#aaa'
          },
          grid: {
            color: '#333'
          }
        },
        x: {
          ticks: {
            color: '#aaa'
          },
          grid: {
            color: '#333'
          }
        }
      }
    }
  });
}

/***** GRÁFICO: GÉNERO *****/
function renderGenero(data) {
  const ctx = document.getElementById("chartGenero").getContext("2d");
  
  const porGenero = {};
  data.forEach(r => {
    const genero = r.genero || "Sin especificar";
    porGenero[genero] = (porGenero[genero] || 0) + 1;
  });
  
  if (charts.genero) charts.genero.destroy();
  
  charts.genero = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(porGenero),
      datasets: [{
        data: Object.values(porGenero),
        backgroundColor: ["#2196F3", "#E91E63", "#9E9E9E"]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: "bottom" }
      }
    }
  });
}

/***** GRÁFICO: ESTADOS POR SEDE *****/
function renderEstadosSede(data) {
  const ctx = document.getElementById("chartEstadosSede").getContext("2d");
  
  const porSede = {};
  data.forEach(r => {
    const sede = r.sede || "Sin sede";
    porSede[sede] = (porSede[sede] || 0) + 1;
  });
  
  const top5Sedes = Object.entries(porSede)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(s => s[0]);
  
  const estados = ["Inscrito", "En proceso", "Nuevo Lead", "No interesado"];
  const datasets = estados.map(estado => {
    const colores = {
      "Inscrito": "#4CAF50",
      "En proceso": "#FFA500",
      "Nuevo Lead": "#2196F3",
      "No interesado": "#F44336"
    };
    
    return {
      label: estado,
      data: top5Sedes.map(sede => 
        data.filter(r => r.sede === sede && r.estado === estado).length
      ),
      backgroundColor: colores[estado]
    };
  });
  
  if (charts.estadosSede) charts.estadosSede.destroy();
  
  charts.estadosSede = new Chart(ctx, {
    type: "bar",
    data: {
      labels: top5Sedes,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        x: { stacked: true },
        y: { stacked: true }
      }
    }
  });
}

/***** GRÁFICO: REFERENCIAS *****/
function renderReferencias(data) {
  const ctx = document.getElementById("chartReferencias").getContext("2d");
  
  const porReferencia = {};
  data.forEach(r => {
    const ref = r.referencia || "Sin especificar";
    porReferencia[ref] = (porReferencia[ref] || 0) + 1;
  });
  
  if (charts.referencias) charts.referencias.destroy();
  
  charts.referencias = new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(porReferencia),
      datasets: [{
        data: Object.values(porReferencia),
        backgroundColor: ["#9C27B0", "#00BCD4", "#FF9800"]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: "bottom" }
      }
    }
  });
}

/***** GRÁFICO: AUTORIZACIÓN *****/
function renderAutorizacion(data) {
  const ctx = document.getElementById("chartAutorizacion").getContext("2d");
  
  const porAutorizacion = {};
  data.forEach(r => {
    const auth = r.autorizacion || "Sin especificar";
    porAutorizacion[auth] = (porAutorizacion[auth] || 0) + 1;
  });
  
  if (charts.autorizacion) charts.autorizacion.destroy();
  
  charts.autorizacion = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(porAutorizacion),
      datasets: [{
        data: Object.values(porAutorizacion),
        backgroundColor: ["#4CAF50", "#F44336", "#9E9E9E"]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: "bottom" }
      }
    }
  });
}

/***** GRÁFICO: TASA DE CONVERSIÓN POR SEDE *****/
function renderConversion(data) {
  const ctx = document.getElementById("chartConversion").getContext("2d");
  
  const porSede = {};
  data.forEach(r => {
    const sede = r.sede || "Sin sede";
    if (!porSede[sede]) porSede[sede] = { total: 0, inscritos: 0 };
    porSede[sede].total++;
    if (r.estado === "Inscrito") porSede[sede].inscritos++;
  });
  
  const conversiones = Object.entries(porSede)
    .map(([sede, datos]) => ({
      sede,
      tasa: datos.total > 0 ? (datos.inscritos / datos.total * 100).toFixed(1) : 0
    }))
    .sort((a, b) => b.tasa - a.tasa);
  
  if (charts.conversion) charts.conversion.destroy();
  
  charts.conversion = new Chart(ctx, {
    type: "bar",
    data: {
      labels: conversiones.map(c => c.sede),
      datasets: [{
        label: "Tasa de conversión (%)",
        data: conversiones.map(c => c.tasa),
        backgroundColor: "#4CAF50"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          max: 100
        }
      }
    }
  });
}

/***** GRÁFICO: REGISTROS POR DÍA DE LA SEMANA *****/
function renderSemanal(data) {
  const ctx = document.getElementById("chartSemanal").getContext("2d");
  
  const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const porDia = [0, 0, 0, 0, 0, 0, 0];
  
  data.forEach(r => {
    if (r.fecha_d) {
      const fecha = new Date(r.fecha_d + "T00:00:00");
      const dia = fecha.getDay();
      porDia[dia]++;
    }
  });
  
  if (charts.semanal) charts.semanal.destroy();
  
  charts.semanal = new Chart(ctx, {
    type: "bar",
    data: {
      labels: diasSemana,
      datasets: [{
        label: "Registros",
        data: porDia,
        backgroundColor: "#2196F3"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false } }
    }
  });
}

/***** EXPORTAR A EXCEL *****/
async function exportarReporte() {
  const btnExportar = document.getElementById("btn-exportar");
  btnExportar.disabled = true;
  btnExportar.textContent = "⏳ Generando...";
  
  try {
    // Obtener los mismos datos que están siendo visualizados
    const periodo = document.getElementById("periodo").value;
    const sedeSeleccionada = document.getElementById("filtro-sede").value;
    
    let query = supabaseClient.from(TABLE_NAME).select("*");
    
    if (periodo !== "all") {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - parseInt(periodo));
      query = query.gte("fecha_d", fechaLimite.toISOString().slice(0, 10));
    }
    
    if (sedeSeleccionada) {
      query = query.eq("sede", sedeSeleccionada);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      alert("No hay datos para exportar con los filtros aplicados");
      return;
    }
    
    // Crear el libro de Excel
    const wb = XLSX.utils.book_new();
    
    // === HOJA 1: RESUMEN EJECUTIVO ===
    const resumen = [];
    
    // Información del reporte
    resumen.push({ A: "REPORTE ANALYTICS - SMART FIT CRM" });
    resumen.push({ A: "Regional EC1" });
    resumen.push({ A: "" });
    resumen.push({ A: "Fecha de generación:", B: new Date().toLocaleString('es-CO') });
    resumen.push({ A: "Período:", B: document.getElementById("periodo").options[document.getElementById("periodo").selectedIndex].text });
    resumen.push({ A: "Sede filtrada:", B: sedeSeleccionada || "Todas las sedes" });
    resumen.push({ A: "" });
    
    // KPIs principales
    const total = data.length;
    const inscritos = data.filter(r => r.estado === "Inscrito").length;
    const conversion = total > 0 ? ((inscritos / total) * 100).toFixed(1) : 0;
    const llamados = data.filter(r => r.llamado).length;
    const enProceso = data.filter(r => r.estado === "En proceso").length;
    const nuevoLead = data.filter(r => r.estado === "Nuevo Lead").length;
    const noInteresado = data.filter(r => r.estado === "No interesado").length;
    
    resumen.push({ A: "=== MÉTRICAS PRINCIPALES ===" });
    resumen.push({ A: "Total de Registros:", B: total });
    resumen.push({ A: "Inscritos:", B: inscritos });
    resumen.push({ A: "Tasa de Conversión:", B: conversion + "%" });
    resumen.push({ A: "Llamados Realizados:", B: llamados });
    resumen.push({ A: "" });
    
    resumen.push({ A: "=== DISTRIBUCIÓN POR ESTADO ===" });
    resumen.push({ A: "Inscrito:", B: inscritos });
    resumen.push({ A: "En proceso:", B: enProceso });
    resumen.push({ A: "Nuevo Lead:", B: nuevoLead });
    resumen.push({ A: "No interesado:", B: noInteresado });
    resumen.push({ A: "" });
    
    // Distribución por género
    const masculino = data.filter(r => r.genero === "MASCULINO").length;
    const femenino = data.filter(r => r.genero === "FEMENINO").length;
    
    resumen.push({ A: "=== DISTRIBUCIÓN POR GÉNERO ===" });
    resumen.push({ A: "Masculino:", B: masculino });
    resumen.push({ A: "Femenino:", B: femenino });
    resumen.push({ A: "" });
    
    // Resumen por sede
    const porSede = {};
    data.forEach(r => {
      const sede = r.sede || "Sin sede";
      if (!porSede[sede]) {
        porSede[sede] = {
          total: 0,
          inscritos: 0,
          enProceso: 0,
          nuevoLead: 0,
          noInteresado: 0,
          llamados: 0
        };
      }
      porSede[sede].total++;
      if (r.estado === "Inscrito") porSede[sede].inscritos++;
      if (r.estado === "En proceso") porSede[sede].enProceso++;
      if (r.estado === "Nuevo Lead") porSede[sede].nuevoLead++;
      if (r.estado === "No interesado") porSede[sede].noInteresado++;
      if (r.llamado) porSede[sede].llamados++;
    });
    
    resumen.push({ A: "=== RESUMEN POR SEDE ===" });
    resumen.push({ A: "Sede", B: "Total", C: "Inscritos", D: "En Proceso", E: "Nuevo Lead", F: "No Interesado", G: "Llamados", H: "% Conversión" });
    
    Object.entries(porSede).forEach(([sede, stats]) => {
      const conversionSede = stats.total > 0 ? ((stats.inscritos / stats.total) * 100).toFixed(1) : 0;
      resumen.push({
        A: sede,
        B: stats.total,
        C: stats.inscritos,
        D: stats.enProceso,
        E: stats.nuevoLead,
        F: stats.noInteresado,
        G: stats.llamados,
        H: conversionSede + "%"
      });
    });
    
    const hojaResumen = XLSX.utils.json_to_sheet(resumen, { skipHeader: true });
    
    // Ajustar anchos de columna
    hojaResumen['!cols'] = [
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 }
    ];
    
    XLSX.utils.book_append_sheet(wb, hojaResumen, "Resumen Ejecutivo");
    
    // === HOJA 2: DATOS COMPLETOS ===
    const datosExportar = data.map(r => ({
      Fecha: r.fecha_d || "",
      Sede: r.sede || "",
      Nombre: r.nombre || "",
      Documento: r.documento || "",
      "Mayor de Edad": r.mayor_edad || "",
      Género: r.genero || "",
      Teléfono: r.telefono || "",
      Referencia: r.referencia || "",
      Autorización: r.autorizacion || "",
      Estado: r.estado || "",
      Observaciones: r.observaciones || "",
      Llamado: r.llamado ? "Sí" : "No"
    }));
    
    const hojaDatos = XLSX.utils.json_to_sheet(datosExportar);
    XLSX.utils.book_append_sheet(wb, hojaDatos, "Datos Completos");
    
    // === HOJAS POR SEDE (si no hay filtro de sede) ===
    if (!sedeSeleccionada) {
      const sedesAgrupadas = data.reduce((acc, row) => {
        const sede = row.sede || "Sin Sede";
        if (!acc[sede]) acc[sede] = [];
        acc[sede].push(row);
        return acc;
      }, {});
      
      Object.keys(sedesAgrupadas).forEach(sede => {
        const datosSede = sedesAgrupadas[sede].map(r => ({
          Fecha: r.fecha_d || "",
          Nombre: r.nombre || "",
          Documento: r.documento || "",
          Género: r.genero || "",
          Teléfono: r.telefono || "",
          Referencia: r.referencia || "",
          Estado: r.estado || "",
          Observaciones: r.observaciones || "",
          Llamado: r.llamado ? "Sí" : "No"
        }));
        
        const hojaSede = XLSX.utils.json_to_sheet(datosSede);
        // Los nombres de hoja tienen un límite de 31 caracteres
        const nombreHoja = sede.substring(0, 31);
        XLSX.utils.book_append_sheet(wb, hojaSede, nombreHoja);
      });
    }
    
    // Generar el archivo
    const fechaHoy = new Date().toISOString().slice(0, 10);
    const nombreArchivo = sedeSeleccionada 
      ? `Analytics_${sedeSeleccionada}_${fechaHoy}.xlsx`
      : `Analytics_Completo_${fechaHoy}.xlsx`;
    
    XLSX.writeFile(wb, nombreArchivo);
    
    alert("✅ Reporte exportado exitosamente");
    
  } catch (err) {
    console.error("Error al exportar:", err);
    alert("Error al generar el reporte. Revisa la consola para más detalles.");
  } finally {
    btnExportar.disabled = false;
    btnExportar.textContent = "📥 Exportar a Excel";
  }
}

/***** EXPORTAR A PDF CON GRÁFICOS *****/
async function exportarPDFConGraficos() {
  const btnExportar = document.getElementById("btn-exportar-pdf");
  btnExportar.disabled = true;
  btnExportar.textContent = "⏳ Generando PDF...";
  
  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPos = 20;
    
    // Obtener datos actuales
    const periodo = document.getElementById("periodo").value;
    const sedeSeleccionada = document.getElementById("filtro-sede").value;
    
    let query = supabaseClient.from(TABLE_NAME).select("*");
    
    if (periodo !== "all") {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - parseInt(periodo));
      query = query.gte("fecha_d", fechaLimite.toISOString().slice(0, 10));
    }
    
    if (sedeSeleccionada) {
      query = query.eq("sede", sedeSeleccionada);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // === PORTADA ===
    pdf.setFillColor(255, 215, 0);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(24);
    pdf.setFont(undefined, 'bold');
    pdf.text('REPORTE ANALYTICS', pageWidth / 2, 20, { align: 'center' });
    pdf.setFontSize(14);
    pdf.text('Smart Fit CRM - Regional EC1', pageWidth / 2, 30, { align: 'center' });
    
    yPos = 50;
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Fecha de generación: ${new Date().toLocaleString('es-CO')}`, 15, yPos);
    yPos += 7;
    pdf.text(`Período: ${document.getElementById("periodo").options[document.getElementById("periodo").selectedIndex].text}`, 15, yPos);
    yPos += 7;
    pdf.text(`Sede: ${sedeSeleccionada || "Todas las sedes"}`, 15, yPos);
    yPos += 15;
    
    // === KPIs ===
    const total = data.length;
    const inscritos = data.filter(r => r.estado === "Inscrito").length;
    const conversion = total > 0 ? ((inscritos / total) * 100).toFixed(1) : 0;
    const llamados = data.filter(r => r.llamado).length;
    
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('MÉTRICAS PRINCIPALES', 15, yPos);
    yPos += 10;
    
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    
    // Cuadros de KPIs
    const kpiWidth = 45;
    const kpiHeight = 20;
    const kpiSpacing = 3;
    
    const kpis = [
      { label: 'Total Registros', value: total, color: [33, 150, 243] },
      { label: 'Inscritos', value: inscritos, color: [76, 175, 80] },
      { label: 'Conversión', value: conversion + '%', color: [255, 152, 0] },
      { label: 'Llamados', value: llamados, color: [156, 39, 176] }
    ];
    
    let xPos = 15;
    kpis.forEach(kpi => {
      pdf.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      pdf.roundedRect(xPos, yPos, kpiWidth, kpiHeight, 3, 3, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.setFont(undefined, 'bold');
      pdf.text(String(kpi.value), xPos + kpiWidth / 2, yPos + 10, { align: 'center' });
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      pdf.text(kpi.label, xPos + kpiWidth / 2, yPos + 16, { align: 'center' });
      xPos += kpiWidth + kpiSpacing;
    });
    
    yPos += kpiHeight + 15;
    
    // === GRÁFICOS ===
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    
    // Función auxiliar para capturar gráficos
    const capturarGrafico = async (canvasId, titulo, width = 180, height = 100) => {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return null;
      
      // Crear un canvas temporal con fondo blanco
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.fillStyle = '#1e1e1e';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(canvas, 0, 0);
      
      return tempCanvas.toDataURL('image/png');
    };
    
    // Nueva página para gráficos
    pdf.addPage();
    yPos = 20;
    
    pdf.text('GRÁFICOS Y ANÁLISIS', 15, yPos);
    yPos += 10;
    
    // Tendencia
    const imgTendencia = await capturarGrafico('chartTendencia');
    if (imgTendencia) {
      if (yPos + 90 > pageHeight - 20) {
        pdf.addPage();
        yPos = 20;
      }
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'bold');
      pdf.text('Tendencia de Registros por Día', 15, yPos);
      yPos += 5;
      pdf.addImage(imgTendencia, 'PNG', 15, yPos, 180, 80);
      yPos += 90;
    }
    
    // Top Sedes y Género (lado a lado)
    if (yPos + 80 > pageHeight - 20) {
      pdf.addPage();
      yPos = 20;
    }
    
    const imgTopSedes = await capturarGrafico('chartTopSedes');
    const imgGenero = await capturarGrafico('chartGenero');
    
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'bold');
    pdf.text('Top 5 Sedes', 15, yPos);
    pdf.text('Distribución por Género', 110, yPos);
    yPos += 5;
    
    if (imgTopSedes) {
      pdf.addImage(imgTopSedes, 'PNG', 15, yPos, 85, 70);
    }
    if (imgGenero) {
      pdf.addImage(imgGenero, 'PNG', 110, yPos, 85, 70);
    }
    yPos += 80;
    
    // Nueva página
    pdf.addPage();
    yPos = 20;
    
    // Estados por Sede
    const imgEstadosSede = await capturarGrafico('chartEstadosSede');
    if (imgEstadosSede) {
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'bold');
      pdf.text('Estados por Sede (Top 5)', 15, yPos);
      yPos += 5;
      pdf.addImage(imgEstadosSede, 'PNG', 15, yPos, 180, 80);
      yPos += 90;
    }
    
    // Referencias y Autorización (lado a lado)
    if (yPos + 80 > pageHeight - 20) {
      pdf.addPage();
      yPos = 20;
    }
    
    const imgReferencias = await capturarGrafico('chartReferencias');
    const imgAutorizacion = await capturarGrafico('chartAutorizacion');
    
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'bold');
    pdf.text('Tipos de Referencia', 15, yPos);
    pdf.text('Autorización de Contacto', 110, yPos);
    yPos += 5;
    
    if (imgReferencias) {
      pdf.addImage(imgReferencias, 'PNG', 15, yPos, 85, 70);
    }
    if (imgAutorizacion) {
      pdf.addImage(imgAutorizacion, 'PNG', 110, yPos, 85, 70);
    }
    
    // Nueva página
    pdf.addPage();
    yPos = 20;
    
    // Conversión por Sede
    const imgConversion = await capturarGrafico('chartConversion');
    if (imgConversion) {
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'bold');
      pdf.text('Tasa de Conversión por Sede', 15, yPos);
      yPos += 5;
      pdf.addImage(imgConversion, 'PNG', 15, yPos, 180, 80);
      yPos += 90;
    }
    
    // Registros Semanales
    if (yPos + 90 > pageHeight - 20) {
      pdf.addPage();
      yPos = 20;
    }
    
    const imgSemanal = await capturarGrafico('chartSemanal');
    if (imgSemanal) {
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'bold');
      pdf.text('Registros por Día de la Semana', 15, yPos);
      yPos += 5;
      pdf.addImage(imgSemanal, 'PNG', 15, yPos, 180, 80);
    }
    
    // === TABLA RESUMEN POR SEDE ===
    pdf.addPage();
    yPos = 20;
    
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('RESUMEN POR SEDE', 15, yPos);
    yPos += 10;
    
    // Agrupar datos por sede
    const porSede = {};
    data.forEach(r => {
      const sede = r.sede || "Sin sede";
      if (!porSede[sede]) {
        porSede[sede] = {
          total: 0,
          inscritos: 0,
          enProceso: 0,
          noInteresado: 0
        };
      }
      porSede[sede].total++;
      if (r.estado === "Inscrito") porSede[sede].inscritos++;
      if (r.estado === "En proceso") porSede[sede].enProceso++;
      if (r.estado === "No interesado") porSede[sede].noInteresado++;
    });
    
    // Tabla
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'bold');
    pdf.text('Sede', 15, yPos);
    pdf.text('Total', 80, yPos);
    pdf.text('Inscritos', 110, yPos);
    pdf.text('En Proceso', 140, yPos);
    pdf.text('% Conv', 175, yPos);
    yPos += 5;
    
    pdf.setLineWidth(0.5);
    pdf.line(15, yPos, 195, yPos);
    yPos += 5;
    
    pdf.setFont(undefined, 'normal');
    Object.entries(porSede).forEach(([sede, stats]) => {
      const conversionSede = stats.total > 0 ? ((stats.inscritos / stats.total) * 100).toFixed(1) : 0;
      
      if (yPos > pageHeight - 20) {
        pdf.addPage();
        yPos = 20;
      }
      
      pdf.text(sede.substring(0, 30), 15, yPos);
      pdf.text(String(stats.total), 80, yPos);
      pdf.text(String(stats.inscritos), 110, yPos);
      pdf.text(String(stats.enProceso), 140, yPos);
      pdf.text(conversionSede + '%', 175, yPos);
      yPos += 7;
    });
    
    // Guardar PDF
    const fechaHoy = new Date().toISOString().slice(0, 10);
    const nombreArchivo = sedeSeleccionada 
      ? `Analytics_${sedeSeleccionada}_${fechaHoy}.pdf`
      : `Analytics_Completo_${fechaHoy}.pdf`;
    
    pdf.save(nombreArchivo);
    
    alert("✅ Reporte PDF generado exitosamente");
    
  } catch (err) {
    console.error("Error al exportar PDF:", err);
    alert("Error al generar el PDF. Revisa la consola para más detalles.");
  } finally {
    btnExportar.disabled = false;
    btnExportar.textContent = "📄 Exportar PDF con Gráficos";
  }
}

/***** EVENTOS *****/
document.getElementById("btn-refresh").addEventListener("click", cargarDatos);
document.getElementById("periodo").addEventListener("change", cargarDatos);
document.getElementById("filtro-sede").addEventListener("change", cargarDatos);
document.getElementById("btn-exportar").addEventListener("click", exportarReporte);
document.getElementById("btn-exportar-pdf").addEventListener("click", exportarPDFConGraficos);

document.getElementById("btn-limpiar-filtros").addEventListener("click", () => {
  document.getElementById("filtro-sede").value = "";
  document.getElementById("periodo").value = "30";
  cargarDatos();
});

/***** INICIALIZACIÓN *****/
document.addEventListener('DOMContentLoaded', async () => {
  console.log("🚀 Inicializando Analytics...");
  
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

      const btnPresentacion = document.querySelector('#btn-presentacion');
      if (btnPresentacion) btnPresentacion.style.display = 'none';
    }
  }
  
  // Cargar sedes primero
  await cargarSedes();
  
  // Luego cargar datos
  await cargarDatos();
  
  console.log("✅ Analytics inicializado correctamente");
});