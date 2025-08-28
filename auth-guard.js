const auth = firebase.auth();

auth.onAuthStateChanged((user) => {
  if (!user) {
    // Se não tiver login → volta pra tela de login
    window.location.href = "index.html";
  }
});
document.getElementById("btn-logout")?.addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "index.html";

});
