const auth = firebase.auth();

document.getElementById("btn-login").addEventListener("click", async () => {
  const email = document.getElementById("login-email").value.trim();
  const senha = document.getElementById("login-senha").value;
  const erro = document.getElementById("login-erro");

  erro.textContent = "";

  if (!email || !senha) {
    erro.textContent = "⚠️ Preencha email e senha.";
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, senha);
    console.log("✅ Login realizado com sucesso!");
    window.location.href = "dashboard.html"; // sempre envia pro dashboard
  } catch (e) {
    console.error("❌ Erro no login:", e);
    let msg = "Erro desconhecido. Tente novamente.";
    switch (e.code) {
      case "auth/missing-password":
        msg = "⚠️ Por favor, informe sua senha.";
        break;
      case "auth/invalid-credential":
        msg = "⚠️ Usuário ou senha inválidos.";
        break;
      case "auth/user-not-found":
        msg = "⚠️ Usuário não encontrado.";
        break;
      case "auth/invalid-email":
        msg = "⚠️ Email inválido.";
        break;
    }
    erro.textContent = msg;
  }
});
