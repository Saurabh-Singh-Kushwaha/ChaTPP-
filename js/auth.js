import { auth, googleProvider } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const googleBtn = document.getElementById("googleBtn");
const showPhoneBtn = document.getElementById("showPhoneBtn");
const phoneSection = document.getElementById("phoneSection");
const sendOtpBtn = document.getElementById("sendOtpBtn");
const verifyOtpBtn = document.getElementById("verifyOtpBtn");
const otpSection = document.getElementById("otpSection");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const authMessage = document.getElementById("authMessage");

let confirmationResult = null;
let recaptchaVerifier = null;
let processing = false;

function showMessage(text = "", type = "") {
  if (!authMessage) return;
  authMessage.textContent = text;
  authMessage.className = "auth-message";
  if (type) authMessage.classList.add(type);
}

function setLoading(button, loading, normalText) {
  if (!button) return;
  button.disabled = loading;
  button.textContent = loading ? "Please wait..." : normalText;
}

function switchTab(mode) {
  const login = mode === "login";
  loginTab?.classList.toggle("active", login);
  signupTab?.classList.toggle("active", !login);
  loginForm?.classList.toggle("hidden", !login);
  signupForm?.classList.toggle("hidden", login);
  showMessage("");
}

loginTab?.addEventListener("click", () => switchTab("login"));
signupTab?.addEventListener("click", () => switchTab("signup"));

async function routeAuthenticatedUser(user) {
  if (!user) return;
  sessionStorage.removeItem("privacyUnlocked");
  window.location.href = "privacy-lock.html";
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (processing) return;

  const email = document.getElementById("loginEmail")?.value.trim();
  const password = document.getElementById("loginPassword")?.value || "";
  if (!email || !password) {
    showMessage("Enter your email and password.", "error");
    return;
  }

  try {
    processing = true;
    setLoading(loginForm.querySelector("button[type='submit']"), true, "Login");
    showMessage("Signing you in...");
    const result = await signInWithEmailAndPassword(auth, email, password);
    await routeAuthenticatedUser(result.user);
  } catch (error) {
    console.error("Login error:", error);
    const messages = {
      "auth/invalid-credential": "Incorrect email or password.",
      "auth/user-not-found": "No account found with this email.",
      "auth/wrong-password": "Incorrect password.",
      "auth/too-many-requests": "Too many attempts. Please try again later.",
      "auth/user-disabled": "This account has been disabled."
    };
    showMessage(messages[error.code] || "Login failed. Please try again.", "error");
  } finally {
    processing = false;
    setLoading(loginForm.querySelector("button[type='submit']"), false, "Login");
  }
});

forgotPasswordBtn?.addEventListener("click", async () => {
  if (processing) return;
  const email = document.getElementById("loginEmail")?.value.trim();
  if (!email) {
    showMessage("Enter your email address first.", "error");
    document.getElementById("loginEmail")?.focus();
    return;
  }

  try {
    processing = true;
    forgotPasswordBtn.disabled = true;
    forgotPasswordBtn.textContent = "Sending...";
    await sendPasswordResetEmail(auth, email);
    showMessage("Password reset email sent. Check your inbox.", "success");
  } catch (error) {
    console.error("Password reset error:", error);
    const messages = {
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/too-many-requests": "Too many attempts. Please try again later."
    };
    showMessage(messages[error.code] || "Could not send the reset email.", "error");
  } finally {
    processing = false;
    forgotPasswordBtn.disabled = false;
    forgotPasswordBtn.textContent = "Forgot password?";
  }
});

signupForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (processing) return;

  const email = document.getElementById("signupEmail")?.value.trim();
  const password = document.getElementById("signupPassword")?.value || "";
  const confirm = document.getElementById("signupConfirmPassword")?.value || "";

  if (!email) return showMessage("Enter your email address.", "error");
  if (password.length < 6) return showMessage("Password must contain at least 6 characters.", "error");
  if (password !== confirm) return showMessage("Passwords do not match.", "error");

  try {
    processing = true;
    setLoading(signupForm.querySelector("button[type='submit']"), true, "Create Account");
    showMessage("Creating your account...");
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await routeAuthenticatedUser(result.user);
  } catch (error) {
    console.error("Signup error:", error);
    const messages = {
      "auth/email-already-in-use": "This email is already registered.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/weak-password": "Password must contain at least 6 characters."
    };
    showMessage(messages[error.code] || "Could not create your account.", "error");
  } finally {
    processing = false;
    setLoading(signupForm.querySelector("button[type='submit']"), false, "Create Account");
  }
});

googleBtn?.addEventListener("click", async () => {
  if (processing) return;
  try {
    processing = true;
    googleBtn.disabled = true;
    googleBtn.textContent = "Connecting...";
    showMessage("Opening Google...");
    const result = await signInWithPopup(auth, googleProvider);
    await routeAuthenticatedUser(result.user);
  } catch (error) {
    console.error("Google login error:", error);
    if (error.code === "auth/popup-closed-by-user") {
      showMessage("Google sign-in cancelled.", "error");
    } else {
      showMessage("Google sign-in failed. Please try again.", "error");
    }
  } finally {
    processing = false;
    googleBtn.disabled = false;
    googleBtn.innerHTML = '<span class="google-symbol">G</span> Continue with Google';
  }
});

showPhoneBtn?.addEventListener("click", () => {
  phoneSection?.classList.toggle("hidden");
  if (!phoneSection?.classList.contains("hidden")) {
    document.getElementById("phoneNumber")?.focus();
    showMessage("Enter your number with country code, e.g. +91...", "");
  }
});

function getRecaptcha() {
  if (recaptchaVerifier) return recaptchaVerifier;
  recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
    size: "normal",
    callback: () => showMessage("reCAPTCHA verified. You can send the OTP.", "success"),
    "expired-callback": () => {
      showMessage("reCAPTCHA expired. Please verify it again.", "error");
      recaptchaVerifier = null;
    }
  });
  return recaptchaVerifier;
}

sendOtpBtn?.addEventListener("click", async () => {
  if (processing) return;
  const phone = document.getElementById("phoneNumber")?.value.trim();
  if (!/^\+[1-9]\d{7,14}$/.test(phone || "")) {
    showMessage("Enter a valid phone number with country code.", "error");
    return;
  }

  try {
    processing = true;
    setLoading(sendOtpBtn, true, "Send OTP");
    showMessage("Sending OTP...");
    const verifier = getRecaptcha();
    confirmationResult = await signInWithPhoneNumber(auth, phone, verifier);
    otpSection?.classList.remove("hidden");
    showMessage("OTP sent. Enter the verification code.", "success");
    document.getElementById("otpCode")?.focus();
  } catch (error) {
    console.error("Phone OTP error:", error);
    showMessage(error.code === "auth/invalid-phone-number" ? "Invalid phone number." : "Could not send OTP. Please try again.", "error");
    if (recaptchaVerifier) {
      try { recaptchaVerifier.clear(); } catch (_) {}
      recaptchaVerifier = null;
    }
  } finally {
    processing = false;
    setLoading(sendOtpBtn, false, "Send OTP");
  }
});

verifyOtpBtn?.addEventListener("click", async () => {
  if (processing || !confirmationResult) return;
  const code = document.getElementById("otpCode")?.value.trim();
  if (!/^\d{6}$/.test(code || "")) {
    showMessage("Enter the 6-digit OTP.", "error");
    return;
  }

  try {
    processing = true;
    setLoading(verifyOtpBtn, true, "Verify OTP");
    showMessage("Verifying OTP...");
    const result = await confirmationResult.confirm(code);
    await routeAuthenticatedUser(result.user);
  } catch (error) {
    console.error("OTP verification error:", error);
    showMessage(error.code === "auth/invalid-verification-code" ? "Incorrect OTP." : "Could not verify OTP.", "error");
  } finally {
    processing = false;
    setLoading(verifyOtpBtn, false, "Verify OTP");
  }
});

// If the browser opens index.html while already authenticated, keep the
// account behind the privacy gate instead of showing a stale login screen.
(async function redirectExistingSession() {
  try {
    const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js");
    onAuthStateChanged(auth, (user) => {
      if (user && !window.location.hash.includes("stay")) {
        // Do not auto-redirect while the user is actively typing in a form.
        const active = document.activeElement;
        const editing = active && ["INPUT", "TEXTAREA"].includes(active.tagName);
        if (!editing) routeAuthenticatedUser(user);
      }
    });
  } catch (error) {
    console.error("Session routing error:", error);
  }
})();
