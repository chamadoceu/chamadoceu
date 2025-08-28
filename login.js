const auth = firebase.auth();

document.getElementById("btn-login").addEventListener("click", async () => {
  const email = document.getElementById("login-email").value;
  const senha = document.getElementById("login-senha").value;
  const erro = document.getElementById("login-erro");

  erro.textContent = "";

  try {
    await auth.signInWithEmailAndPassword(email, senha);
    window.location.href = "index.html"; // sucesso → vai pro sistema
  } catch (e) {
    erro.textContent = "⚠️ Usuário ou senha inválidos.";
  }
});
