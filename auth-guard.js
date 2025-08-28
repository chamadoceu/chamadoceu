// Garante que o Firebase foi inicializado antes de rodar isso
const auth = firebase.auth();

// Verifica se o usuário está autenticado
auth.onAuthStateChanged((user) => {
  if (!user) {
    console.log("⛔ Nenhum usuário logado. Redirecionando para login...");
    window.location.href = "index.html"; // se não tiver login → volta pro login
  } else {
    console.log("✅ Usuário logado:", user.email);
  }
});

// Botão de Logout
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("btn-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await auth.signOut();
        console.log("👋 Logout realizado, redirecionando para login...");
        window.location.href = "index.html";
      } catch (error) {
        console.error("❌ Erro ao sair:", error);
      }
    });
  }
});
