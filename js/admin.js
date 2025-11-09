import { auth } from "./firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

document.addEventListener("DOMContentLoaded", function() {
    const adminName = localStorage.getItem("fullName") || "ADMIN NAME";
    document.querySelector(".nav h3").textContent = adminName;

    const admin2Name = localStorage.getItem("fullName") || "ADMIN NAME";
    document.querySelector(".middle__1 h1").textContent = `WELCOME, ${admin2Name}!`;

    const penaltiesBtn = document.querySelector(".manage-penalties");
    if (penaltiesBtn) {
        penaltiesBtn.addEventListener("click", () => {
            window.location.href = "penalties.html";
        });
    }

    const manageBtn = document.querySelector(".manage-equipment");
    if (manageBtn) {
        manageBtn.addEventListener("click", () => {
            window.location.href = "return.html";
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