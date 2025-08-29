const auth = firebase.auth();

document.getElementById("btn-login").addEventListener("click", async () => {
  const email = document.getElementById("login-email").value;
  const senha = document.getElementById("login-senha").value;
  const erro = document.getElementById("login-erro");

  erro.textContent = "";

  try {
    await auth.signInWithEmailAndPassword(email, senha);
    console.log("✅ Login realizado com sucesso!");
    window.location.href = "app.html"; // redireciona pro dashboard
  } catch (e) {
    console.error("❌ Erro no login:", e);
    erro.textContent = "⚠️ Usuário ou senha inválidos.";
  }
});
