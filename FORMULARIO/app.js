// -------- CONFIGURACIÓN SUPABASE --------

const supabaseClient = createSupabaseClient();

const TABLE_NAME = "invitados";
// utilidades UI
const $ = (id) => document.getElementById(id);
const alertBox = $("alert");

function showAlert(msg, type="ok"){
  alertBox.textContent = msg;
  alertBox.className = `alert ${type === "error" ? "err" : "ok"}`;
  alertBox.hidden = false;
  setTimeout(()=> alertBox.hidden = true, 4500);
}

// Mostrar información del usuario
async function mostrarInfoUsuario() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (session) {
    const userRole = session.user.app_metadata.rol;
    const userSede = session.user.app_metadata.sede;
    const userEmail = session.user.email;
    
    const userInfo = document.getElementById('user-info');
    const roleBadge = document.getElementById('user-role-badge');
    const sedeBadge = document.getElementById('user-sede-badge');
    
    if (userInfo && roleBadge && sedeBadge) {
      // Traducir rol a español
      const rolesES = {
        'maestro': 'MAESTRO',
        'gerente': 'GERENTE',
        'recepcionista': 'RECEPCIONISTA'
      };
      
      roleBadge.textContent = `👤 ${rolesES[userRole] || userRole.toUpperCase()}`;
      sedeBadge.textContent = `📍 ${userSede || 'Todas las sedes'}`;
      userInfo.style.display = 'flex';
    }
  }
}

// ========================================
// NUEVA FUNCIÓN: Configurar sede según rol
// ========================================

async function configurarSedeSegunRol() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (!session) return;
  
  const userRole = session.user.app_metadata.rol;
  const userSede = session.user.app_metadata.sede;
  const selectSede = $("sede");
  
  console.log("🔍 Configurando sede:", { userRole, userSede });
  
  // Si es gerente o recepcionista
  if (userRole === 'gerente' || userRole === 'recepcionista') {
    
    // IMPORTANTE: Verificar que la sede del usuario existe en el select
    let sedeEncontrada = false;
    
    for (let i = 0; i < selectSede.options.length; i++) {
      if (selectSede.options[i].value === userSede) {
        selectSede.selectedIndex = i;
        sedeEncontrada = true;
        break;
      }
    }
    
    if (!sedeEncontrada) {
      console.error("⚠️ La sede del usuario no existe en el formulario:", userSede);
      showAlert("Error: Tu sede no está configurada correctamente. Contacta al administrador.", "error");
      return;
    }
    
    // Deshabilitar el select
    selectSede.disabled = true;
    
    // Cambiar el estilo para indicar que está bloqueado
    selectSede.style.backgroundColor = '#1a1a1a';
    selectSede.style.cursor = 'not-allowed';
    selectSede.style.border = '2px solid #666';
    
    console.log("✅ Sede configurada y bloqueada para:", userRole);
  } else {
    // Si es maestro, mantener todo habilitado
    selectSede.disabled = false;
    selectSede.style.backgroundColor = '';
    selectSede.style.cursor = '';
    selectSede.style.border = '';
    
    console.log("✅ Sede libre para maestro");
  }
}

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("btn");
  btn.disabled = true; 
  btn.style.opacity = .7;
  btn.textContent = "Verificando...";

  // Extraemos el documento para verificarlo primero
  const documentoTrimmed = $("documento").value.trim();

  // Verificación de duplicados
  try {
    const { data: existing, error: checkError } = await supabaseClient
      .from(TABLE_NAME)
      .select('nombre')
      .eq('documento', documentoTrimmed);

    if (checkError) {
      throw new Error(`Error al verificar duplicados: ${checkError.message}`);
    }

    if (existing && existing.length > 0) {
      showAlert(`Error: El documento ${documentoTrimmed} ya está registrado a nombre de ${existing[0].nombre}.`, "error");
      btn.disabled = false; 
      btn.style.opacity = 1;
      btn.textContent = "Guardar Registro";
      return;
    }
  } catch (err) {
    console.error(err);
    showAlert("Ocurrió un error inesperado durante la verificación.", "error");
    btn.disabled = false; 
    btn.style.opacity = 1;
    btn.textContent = "Guardar Registro";
    return;
  }

  // Si llegamos aquí, no hay duplicados. Procedemos a guardar.
  btn.textContent = "Guardando...";

  const payload = {
    sede: $("sede").value.trim(),
    fecha_d: new Date().toISOString().slice(0,10),
    nombre: $("nombre").value.trim(),
    mayor_edad: $("mayorEdad").value.trim(),
    documento: documentoTrimmed,
    genero: $("genero").value.trim(),
    telefono: $("telefono").value.trim(),
    barrio: $("barrio").value.trim() || null,
    referencia: $("referencia").value.trim(),
    autorizacion: $("autorizacion").value.trim(),
    estado: $("estado").value.trim(),
    fecha_contacto: $("fechaContacto").value || null,
    motivacion: $("motivacion").value.trim(),
    observaciones: $("observaciones").value.trim(),
    llamado: false
  };

  try {
    const { data, error } = await supabaseClient
      .from(TABLE_NAME)
      .insert([payload])
      .select();

    if (error) {
      console.error("Insert error:", error);
      showAlert(`Ocurrió un error al guardar: ${error.message}`, "error");
    } else {
      showAlert("✅ Registro guardado correctamente.");
      $("form").reset();
      // Reconfigurar la sede después del reset
      await configurarSedeSegunRol();
    }
  } catch (err) {
    console.error(err);
    showAlert("Ocurrió un error inesperado al guardar.", "error");
  } finally {
    btn.disabled = false; 
    btn.style.opacity = 1;
    btn.textContent = "Guardar Registro";
  }
});

// ========================================
// INICIALIZACIÓN: Configurar sede al cargar
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log("🚀 Inicializando formulario...");
  await mostrarInfoUsuario();
  await configurarSedeSegunRol();
});

// Logout
document.addEventListener('DOMContentLoaded', () => {
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        btnLogout.textContent = 'Cerrando...';
        btnLogout.disabled = true;
        await supabaseClient.auth.signOut();
        window.location.href = '../LOGIN/index.html';
      }
    });
  }
});
