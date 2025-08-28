const auth = firebase.auth();

auth.onAuthStateChanged((user) => {
  if (!user) {
    console.log("⛔ Nenhum usuário logado. Redirecionando para login...");
    window.location.href = "index.html"; // leva pro login
  } else {
    console.log("✅ Usuário logado:", user.email);
  }
});

document.getElementById("btn-logout")?.addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "index.html";

});

