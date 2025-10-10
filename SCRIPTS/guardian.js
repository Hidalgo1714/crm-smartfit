
(async () => {

const supabaseClient = createSupabaseClient();

 const { data: { session } } = await supabaseClient.auth.getSession();


  if (!session) {
    // Si no hay sesión, siempre redirigir al login.
    // Esto protege todas las páginas donde se incluya el guardián.
    window.location.href = '../LOGIN/index.html';
    return;
  }

  // Si hay sesión, obtenemos el rol del usuario
  const userRole = session.user.app_metadata.rol;

  // Obtenemos el nombre del archivo de la página actual (ej: "dashboard.html")
  const currentPage = window.location.pathname.split('/').pop();

  // Definimos las páginas restringidas para el rol 'recepcionista'
  const restrictedPagesForReceptionist = ['analytics.html']; // Puedes agregar más páginas aquí si las creas en el futuro

  if (userRole === 'recepcionista' && restrictedPagesForReceptionist.includes(currentPage.toLowerCase())) {
    // Si es recepcionista e intenta acceder a una página restringida, lo denegamos y lo mandamos al dashboard.
    alert("Acceso denegado. No tienes permiso para ver esta página.");
    window.location.href = '../DASHBOARD/index.html';
  }

})();