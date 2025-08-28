// Espera o carregamento do DOM antes de rodar
document.addEventListener("DOMContentLoaded", () => {
  // Garante que o Firebase já foi inicializado
  const auth = firebase.auth();

  // Protege a página
  auth.onAuthStateChanged((user) => {
    if (!user) {
      console.log("⛔ Nenhum usuário logado. Redirecionando para login...");
      window.location.href = "index.html"; // volta pro login
    } else {
      console.log("✅ Usuário logado:", user.email);
    }
  });

  // Botão de logout
  const logoutBtn = document.getElementById("btn-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await auth.signOut();
        console.log("👋 Logout realizado, voltando para login...");
        window.location.href = "index.html";
      } catch (error) {
        console.error("❌ Erro ao sair:", error);
      }
    });
  } else {
    console.warn("⚠️ Botão de logout (#btn-logout) não encontrado no HTML.");
  }
});
