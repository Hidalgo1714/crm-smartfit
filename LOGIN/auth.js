/***** CONFIG *****/

const supabaseClient = createSupabaseClient();

/***** UI ELEMENTS *****/
const form = document.getElementById("auth-form");
const btnLogin = document.getElementById("btn-login");
const btnSignup = document.getElementById("btn-signup");
const inputEmail = document.getElementById("email");
const inputPassword = document.getElementById("password");
const alertBox = document.getElementById("alert-box");

/***** HELPER: SHOW ALERT *****/
function showAlert(msg, type = "ok") {
  alertBox.textContent = msg;
  alertBox.className = `alert ${type === "error" ? "err" : "ok"}`;
  alertBox.hidden = false;
  setTimeout(() => alertBox.hidden = true, 4500);
}

/***** LÓGICA DE REGISTRO (SIGN UP) *****/
btnSignup.addEventListener("click", async () => {
  const email = inputEmail.value.trim();
  const password = inputPassword.value.trim();

  if (!email || !password) {
    showAlert("Por favor, ingresa un correo y contraseña.", "error");
    return;
  }
  if (password.length < 6) {
    showAlert("La contraseña debe tener al menos 6 caracteres.", "error");
    return;
  }

  // Usamos la función signUp de Supabase
  const { data, error } = await supabaseClient.auth.signUp({
    email: email,
    password: password,
  });

  if (error) {
    showAlert(`Error al registrar: ${error.message}`, "error");
  } else {
    showAlert("✅ ¡Registro exitoso! Ahora puedes iniciar sesión.");
  }
});

/***** LÓGICA DE INICIO DE SESIÓN (LOGIN) *****/
form.addEventListener("submit", async (e) => {
  e.preventDefault(); // Evita que la página se recargue

  const email = inputEmail.value.trim();
  const password = inputPassword.value.trim();

  if (!email || !password) {
    showAlert("Por favor, ingresa tu correo y contraseña.", "error");
    return;
  }

  // Usamos la función signInWithPassword de Supabase
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    showAlert("Error: Correo o contraseña incorrectos.", "error");
  } else {
    // Si el login es exitoso, redirigimos al Dashboard
    window.location.href = '../FORMULARIO/index.html';
  }
});