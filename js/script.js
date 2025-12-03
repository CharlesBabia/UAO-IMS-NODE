import { app, analytics, db, auth } from "./firebase-config.js";
import {
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  setDoc,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  
  const showLogin = document.querySelector("#showLogin");
  const showRegister = document.querySelector("#showRegister");
  const loginForm = document.querySelector("#loginForm");
  const registerForm = document.querySelector("#registerForm");
  const formTitle = document.querySelector("#formTitle");
  const formSubtitle = document.querySelector("#formSubtitle");
  const googleBtn = document.querySelector("#googleBtn");

  let currentMode = "login"; // track wether login or register tab is active

  // tab switching
  showLogin.addEventListener("click", (e) => {
    e.preventDefault();
    loginForm.style.display = "block";
    registerForm.style.display = "none";
    formTitle.innerHTML = 'Welcome to <span class="highlight">UAO-IMS</span>';
    formSubtitle.innerHTML = 'Access the system using your registered <strong>XU EMAIL</strong> account';
    googleBtn.innerText = "Login with Google";

    showLogin.classList.add("active");
    showRegister.classList.remove("active");
    currentMode = "login";
  });

  showRegister.addEventListener("click", (e) => {
    e.preventDefault();
    loginForm.style.display = "none";
    registerForm.style.display = "block";
    formTitle.innerHTML = 'Create your <span class="highlight">UAO-IMS</span> Account';
    formSubtitle.innerHTML = 'Use your <strong>XU EMAIL</strong> to register';
    googleBtn.innerText = "Register with Google";

    showRegister.classList.add("active");
    showLogin.classList.remove("active");
    currentMode = "register";
  });

  // google login
  googleBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Only allow XU emails
      if (
        !(
          user.email.endsWith("@my.xu.edu.ph") ||
          user.email.endsWith("@xu.edu.ph")
        )
      ) {
        alert("Error: Can only use XU email for Google sign-up/sign-in.");
        return;
      }

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (currentMode === "register") {
        if (userDoc.exists()) {
          alert("Account already exists. Please login instead.");
          return;
        }
        // save new user info to database
        const fullName = user.displayName || "User";
        await setDoc(userDocRef, { fullName, email: user.email, role: "user", penalty: false });
        localStorage.setItem("fullName", fullName);
        localStorage.setItem("email", user.email);
        alert("Registration successful!, Logging you in...");
        window.location.href = "user.html";
      } else {
        // login
        if (!userDoc.exists()) {
          alert("No account found. Please register first.");
          return;
        }
        const fullName = userDoc.data().fullName || user.displayName || "User";
        localStorage.setItem("fullName", fullName);
        localStorage.setItem("email", user.email);
        const role = userDoc.data().role || "user";
        alert("Login successful!");
        if (role === "admin") {
          window.location.href = "admin.html";
        } else {
          window.location.href = "user.html";
        }
      }
    } catch (error) {
      alert(`Google sign-in failed: ${error.message}`);
    }
  });
});
