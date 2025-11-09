document.addEventListener("DOMContentLoaded", function() {
    const userName = localStorage.getItem("fullName") || "USER NAME";
    document.getElementById("userName").textContent = userName;

    const borrowBtn = document.querySelector(".borrow");
    if (borrowBtn) {
        borrowBtn.addEventListener("click", () => {
            window.location.href = "borrow.html";
        });
    }

    const signOutBtn = document.querySelector(".signout");
    signOutBtn.addEventListener("click", () => {
        window.location.href = "index.html";
    });
});
