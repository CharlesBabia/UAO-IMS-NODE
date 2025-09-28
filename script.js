
const togglePassword = document.querySelector("#togglePassword");
const password = document.querySelector("#password");

if (togglePassword) {
  togglePassword.addEventListener("click", () => {
    const type = password.getAttribute("type") === "password" ? "text" : "password";
    password.setAttribute("type", type);
  });
}


const toggleRegPassword = document.querySelector("#toggleRegPassword");
const regPassword = document.querySelector("#regPassword");

if (toggleRegPassword) {
  toggleRegPassword.addEventListener("click", () => {
    const type = regPassword.getAttribute("type") === "password" ? "text" : "password";
    regPassword.setAttribute("type", type);
  });
}


const showLogin = document.querySelector("#showLogin");
const showRegister = document.querySelector("#showRegister");
const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");
const formTitle = document.querySelector("#formTitle");
const formSubtitle = document.querySelector("#formSubtitle");
const googleBtn = document.querySelector("#googleBtn");

showLogin.addEventListener("click", (e) => {
  e.preventDefault();
  loginForm.style.display = "block";
  registerForm.style.display = "none";
  formTitle.innerHTML = 'Welcome to <span class="highlight">UAO-IMS</span>';
  formSubtitle.innerHTML = 'Access the system using your <strong>@my.xu.edu.ph</strong> account or login as admin';
  googleBtn.innerText = "Login with Google";

  showLogin.classList.add("active");
  showRegister.classList.remove("active");
});

showRegister.addEventListener("click", (e) => {
  e.preventDefault();
  loginForm.style.display = "none";
  registerForm.style.display = "block";
  formTitle.innerHTML = 'Create your <span class="highlight">UAO-IMS</span> Account';
  formSubtitle.innerHTML = 'Use your <strong>@my.xu.edu.ph</strong> email to register';
  googleBtn.innerText = "Register with Google";

  showRegister.classList.add("active");
  showLogin.classList.remove("active");
});
