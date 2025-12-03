import { auth } from "./firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

document.addEventListener("DOMContentLoaded", function() {
    const userName = localStorage.getItem("fullName") || "USER NAME";
    const email = localStorage.getItem("email") || "EMAIL ADDRESS"
    document.getElementById("userName").textContent = userName;

    const borrowBtn = document.querySelector(".borrow");
    if (borrowBtn) {
        borrowBtn.addEventListener("click", () => {
            window.location.href = "borrow.html";
        });
    }

    const signOutBtn = document.querySelector(".signout");
    signOutBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to sign out?")) {
            signOut(auth).then(() => {
                localStorage.clear();
                alert("Signed out successfully.");
                window.location.href = "index.html";
            }).catch((error) => {
                alert("Sign out failed.");
            });
        }
    });
});
