console.log("✅ login.js carregado");

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOM carregado");

  const btn = document.getElementById("btn-login");
  console.log("🔎 Botão encontrado?", btn);

  if (btn) {
    btn.addEventListener("click", () => {
      console.log("👉 Clique detectado!");
    });
  }
});
