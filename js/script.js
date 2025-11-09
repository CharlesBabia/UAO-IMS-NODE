import { app, analytics, db, auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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
  const togglePassword = document.querySelector("#togglePassword");
  const password = document.querySelector("#password");
  const toggleRegPassword = document.querySelector("#toggleRegPassword");
  const regPassword = document.querySelector("#regPassword");

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

  // show password
  if (togglePassword) {
    togglePassword.addEventListener("click", () => {
      const type = password.getAttribute("type") === "password" ? "text" : "password";
      password.setAttribute("type", type);
    });
  }

  if (toggleRegPassword) {
    toggleRegPassword.addEventListener("click", () => {
      const type = regPassword.getAttribute("type") === "password" ? "text" : "password";
      regPassword.setAttribute("type", type);
    });
  }

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
        alert("Error: Can only use XU email for Google sign-in");
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
        await setDoc(userDocRef, { fullName, email: user.email, role: "user", Penalty: false });
        localStorage.setItem("fullName", fullName);
        alert("Registration successful!");
        window.location.href = "user.html";
      } else {
        // login
        if (!userDoc.exists()) {
          alert("No account found. Please register first.");
          return;
        }
        const fullName = userDoc.data().fullName || user.displayName || "User";
        localStorage.setItem("fullName", fullName);
        const role = userDoc.data().role || "user";
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

  // Login
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = loginForm.querySelector("input[type='email']").value;
    const password = loginForm.querySelector("input[type='password']").value;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // function to fetch role from the database in order to know where to redirect
      const userDoc = await getDoc(doc(db, "users", user.uid));
      let role = "user";
      if (userDoc.exists()) {
        localStorage.setItem("fullName", userDoc.data().fullName);
        role = userDoc.data().role || "user";
      } else {
        localStorage.setItem("fullName", "User");
      }
      if (role === "admin") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "user.html";
      }
    } catch (error) {
      alert(`Login failed: ${error.message}`);
    }
  });

  // Registration
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fullName = registerForm.querySelector("input[type='text']").value;
    const email = registerForm.querySelector("input[type='email']").value;
    const password = registerForm.querySelector("#regPassword").value;
    const confirmPassword = registerForm.querySelector("input[placeholder='Re-enter your password']").value;

    // make it so that users can only register with a @my.xu.edu.ph or @xu.edu.ph email address
    if (
      !(
        email.endsWith("@my.xu.edu.ph") ||
        email.endsWith("@xu.edu.ph")
      )
    ) {
      alert("Error: Can only register using XU email");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      // saves user info(attributes) to database
      await setDoc(doc(db, "users", user.uid), { fullName, email, role: "user", Penalty: false });
      alert("Registration successful!");
      registerForm.reset();
      showLogin.click();
    } catch (error) {
      alert(`Registration failed: ${error.message}`);
    }
  });
});
