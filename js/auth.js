// js/auth.js

import {
  auth,
  db,
  googleProvider
} from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


// ========================================
// ELEMENTS
// ========================================

const loginTab =
  document.getElementById("loginTab");

const signupTab =
  document.getElementById("signupTab");

const loginForm =
  document.getElementById("loginForm");

const signupForm =
  document.getElementById("signupForm");

const googleBtn =
  document.getElementById("googleBtn");

const showPhoneBtn =
  document.getElementById("showPhoneBtn");

const phoneSection =
  document.getElementById("phoneSection");

const sendOtpBtn =
  document.getElementById("sendOtpBtn");

const verifyOtpBtn =
  document.getElementById("verifyOtpBtn");

const otpSection =
  document.getElementById("otpSection");

const forgotPasswordBtn =
  document.getElementById("forgotPasswordBtn");

const authMessage =
  document.getElementById("authMessage");


// ========================================
// VARIABLES
// ========================================

let confirmationResult = null;

let recaptchaVerifier = null;

let isProcessing = false;


// ========================================
// MESSAGE
// ========================================

function showMessage(message, type = "") {

  if (!authMessage) return;

  authMessage.textContent = message;

  authMessage.className = "auth-message";

  if (type === "error") {
    authMessage.classList.add("error");
  }

  if (type === "success") {
    authMessage.classList.add("success");
  }
}


// ========================================
// BUTTON LOADING
// ========================================

function setButtonLoading(
  button,
  loading,
  normalText
) {

  if (!button) return;

  button.disabled = loading;

  button.textContent =
    loading
      ? "Please wait..."
      : normalText;
}


// ========================================
// SWITCH LOGIN / SIGNUP
// ========================================

function switchTab(mode) {

  if (mode === "login") {

    loginTab.classList.add("active");

    signupTab.classList.remove("active");

    loginForm.classList.remove("hidden");

    signupForm.classList.add("hidden");

  } else {

    signupTab.classList.add("active");

    loginTab.classList.remove("active");

    signupForm.classList.remove("hidden");

    loginForm.classList.add("hidden");

  }

  showMessage("");

}


loginTab.addEventListener(
  "click",
  () => switchTab("login")
);


signupTab.addEventListener(
  "click",
  () => switchTab("signup")
);


// ========================================
// CHECK USER PROFILE
// ========================================

async function routeUser(user) {

  if (!user) return;

  try {

    const userRef =
      doc(
        db,
        "users",
        user.uid
      );

    const snapshot =
      await getDoc(userRef);


    if (snapshot.exists()) {

      window.location.href =
        "home.html";

    } else {

      window.location.href =
        "profile-setup.html";

    }

  } catch (error) {

    console.error(
      "Profile check error:",
      error
    );

    showMessage(
      "Could not load your account. Please try again.",
      "error"
    );

  }

}


// ========================================
// EMAIL LOGIN
// ========================================

loginForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    if (isProcessing) return;

    const email =
      document
        .getElementById("loginEmail")
        .value
        .trim();

    const password =
      document
        .getElementById("loginPassword")
        .value;


    if (!email || !password) {

      showMessage(
        "Enter your email and password.",
        "error"
      );

      return;
    }


    try {

      isProcessing = true;

      setButtonLoading(
        loginForm.querySelector("button[type='submit']"),
        true,
        "Login"
      );

      showMessage(
        "Signing you in..."
      );


      const result =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );


      await routeUser(
        result.user
      );


    } catch (error) {

      console.error(
        "Login error:",
        error
      );


      let message =
        "Login failed. Please try again.";


      if (
        error.code ===
        "auth/invalid-credential"
      ) {

        message =
          "Incorrect email or password.";

      } else if (
        error.code ===
        "auth/user-not-found"
      ) {

        message =
          "No account found with this email.";

      } else if (
        error.code ===
        "auth/wrong-password"
      ) {

        message =
          "Incorrect password.";

      } else if (
        error.code ===
        "auth/too-many-requests"
      ) {

        message =
          "Too many attempts. Please try again later.";

      } else if (
        error.code ===
        "auth/user-disabled"
      ) {

        message =
          "This account has been disabled.";

      }


      showMessage(
        message,
        "error"
      );


    } finally {

      isProcessing = false;

      setButtonLoading(
        loginForm.querySelector("button[type='submit']"),
        false,
        "Login"
      );

    }

  }
);


// ========================================
// FORGOT PASSWORD
// ========================================

forgotPasswordBtn.addEventListener(
  "click",
  async () => {

    if (isProcessing) return;


    const email =
      document
        .getElementById("loginEmail")
        .value
        .trim();


    if (!email) {

      showMessage(
        "Enter your email address first.",
        "error"
      );

      document
        .getElementById("loginEmail")
        .focus();

      return;
    }


    try {

      isProcessing = true;

      forgotPasswordBtn.disabled = true;

      forgotPasswordBtn.textContent =
        "Sending...";


      await sendPasswordResetEmail(
        auth,
        email
      );


      showMessage(
        "Password reset email sent. Check your inbox.",
        "success"
      );


    } catch (error) {

      console.error(
        "Password reset error:",
        error
      );


      let message =
        "Could not send the reset email.";


      if (
        error.code ===
        "auth/invalid-email"
      ) {

        message =
          "Please enter a valid email address.";

      } else if (
        error.code ===
        "auth/user-not-found"
      ) {

        message =
          "No account was found with this email.";

      } else if (
        error.code ===
        "auth/too-many-requests"
      ) {

        message =
          "Too many attempts. Please try again later.";

      }


      showMessage(
        message,
        "error"
      );


    } finally {

      isProcessing = false;

      forgotPasswordBtn.disabled = false;

      forgotPasswordBtn.textContent =
        "Forgot password?";

    }

  }
);


// ========================================
// EMAIL SIGN UP
// ========================================

signupForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    if (isProcessing) return;


    const email =
      document
        .getElementById("signupEmail")
        .value
        .trim();


    const password =
      document
        .getElementById("signupPassword")
        .value;


    const confirmPassword =
      document
        .getElementById("signupConfirmPassword")
        .value;


    if (!email) {

      showMessage(
        "Enter your email address.",
        "error"
      );

      return;
    }


    if (password.length < 6) {

      showMessage(
        "Password must contain at least 6 characters.",
        "error"
      );

      return;
    }


    if (password !== confirmPassword) {

      showMessage(
        "Passwords do not match.",
        "error"
      );

      return;
    }


    try {

      isProcessing = true;

      setButtonLoading(
        signupForm.querySelector("button[type='submit']"),
        true,
        "Create Account"
      );


      showMessage(
        "Creating your account..."
      );


      const result =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );


      showMessage(
        "Account created!",
        "success"
      );


      setTimeout(
        () => {

          window.location.href =
            "profile-setup.html";

        },
        400
      );


    } catch (error) {

      console.error(
        "Signup error:",
        error
      );


      let message =
        "Could not create your account.";


      if (
        error.code ===
        "auth/email-already-in-use"
      ) {

        message =
          "This email is already registered.";

      } else if (
        error.code ===
        "auth/invalid-email"
      ) {

        message =
          "Please enter a valid email address.";

      } else if (
        error.code ===
        "auth/weak-password"
      ) {

        message =
          "Password must contain at least 6 characters.";

      }


      showMessage(
        message,
        "error"
      );


    } finally {

      isProcessing = false;

      setButtonLoading(
        signupForm.querySelector("button[type='submit']"),
        false,
        "Create Account"
      );

    }

  }
);


// ========================================
// GOOGLE LOGIN
// ========================================

googleBtn.addEventListener(
  "click",
  async () => {

    if (isProcessing) return;


    try {

      isProcessing = true;

      googleBtn.disabled = true;

      googleBtn.innerHTML =
        "Connecting to Google...";


      showMessage(
        "Opening Google..."
      );


      const result =
        await signInWithPopup(
          auth,
          googleProvider
        );


      await routeUser(
        result.user
      );


    } catch (error) {

      console.error(
        "Google login error:",
        error
      );


      if (
        error.code ===
        "auth/popup-closed-by-user"
      ) {

        showMessage(
          "Google sign-in was cancelled.",
          "error"
        );

      } else if (
        error.code ===
        "auth/popup-blocked"
      ) {

        showMessage(
          "The browser blocked the Google popup.",
          "error"
        );

      } else {

        showMessage(
          "Google sign-in failed. Please try again.",
          "error"
        );

      }


    } finally {

      isProcessing = false;

      googleBtn.disabled = false;

      googleBtn.innerHTML =
        '<span class="google-symbol">G</span> Continue with Google';

    }

  }
);


// ========================================
// PHONE LOGIN
// ========================================

showPhoneBtn.addEventListener(
  "click",
  () => {

    phoneSection.classList.toggle(
      "hidden"
    );


    if (
      !phoneSection.classList.contains(
        "hidden"
      )
    ) {

      initializeRecaptcha();

    }

  }
);


// ========================================
// INITIALIZE RECAPTCHA
// ========================================

function initializeRecaptcha() {

  if (recaptchaVerifier) {
    return;
  }


  try {

    recaptchaVerifier =
      new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "normal",

          callback: () => {

            showMessage(
              "Verification completed. You can send the OTP.",
              "success"
            );

          },

          "expired-callback": () => {

            showMessage(
              "reCAPTCHA expired. Please verify again.",
              "error"
            );

          }
        }
      );


    recaptchaVerifier
      .render()
      .catch(
        (error) => {

          console.error(
            "reCAPTCHA render error:",
            error
          );

        }
      );


  } catch (error) {

    console.error(
      "reCAPTCHA initialization error:",
      error
    );

    recaptchaVerifier = null;

  }

}


// ========================================
// SEND PHONE OTP
// ========================================

sendOtpBtn.addEventListener(
  "click",
  async () => {

    if (isProcessing) return;


    const phoneNumber =
      document
        .getElementById("phoneNumber")
        .value
        .trim();


    if (!phoneNumber) {

      showMessage(
        "Enter your phone number first.",
        "error"
      );

      return;
    }


    if (
      !phoneNumber.startsWith("+")
    ) {

      showMessage(
        "Use the international format, for example +91XXXXXXXXXX.",
        "error"
      );

      return;
    }


    try {

      isProcessing = true;

      sendOtpBtn.disabled = true;

      sendOtpBtn.textContent =
        "Sending...";


      if (!recaptchaVerifier) {

        initializeRecaptcha();

      }


      if (!recaptchaVerifier) {

        throw new Error(
          "RECAPTCHA_NOT_READY"
        );

      }


      confirmationResult =
        await signInWithPhoneNumber(
          auth,
          phoneNumber,
          recaptchaVerifier
        );


      otpSection.classList.remove(
        "hidden"
      );


      showMessage(
        "OTP sent. Enter the 6-digit code.",
        "success"
      );


    } catch (error) {

      console.error(
        "Phone OTP error:",
        error
      );


      let message =
        "Could not send OTP. Please try again.";


      if (
        error.message ===
        "RECAPTCHA_NOT_READY"
      ) {

        message =
          "Security verification is not ready. Please refresh and try again.";

      } else if (
        error.code ===
        "auth/invalid-phone-number"
      ) {

        message =
          "Enter a valid phone number.";

      } else if (
        error.code ===
        "auth/too-many-requests"
      ) {

        message =
          "Too many attempts. Please try again later.";

      } else if (
        error.code ===
        "auth/quota-exceeded"
      ) {

        message =
          "Phone verification quota has been exceeded.";

      }


      showMessage(
        message,
        "error"
      );


      await resetRecaptcha();

    } finally {

      isProcessing = false;

      sendOtpBtn.disabled = false;

      sendOtpBtn.textContent =
        "Send OTP";

    }

  }
);


// ========================================
// VERIFY PHONE OTP
// ========================================

verifyOtpBtn.addEventListener(
  "click",
  async () => {

    if (isProcessing) return;


    const code =
      document
        .getElementById("otpCode")
        .value
        .trim();


    if (!confirmationResult) {

      showMessage(
        "Request an OTP first.",
        "error"
      );

      return;
    }


    if (!/^\d{6}$/.test(code)) {

      showMessage(
        "Enter the 6-digit OTP.",
        "error"
      );

      return;
    }


    try {

      isProcessing = true;

      verifyOtpBtn.disabled = true;

      verifyOtpBtn.textContent =
        "Verifying...";


      const result =
        await confirmationResult.confirm(
          code
        );


      showMessage(
        "Phone verified!",
        "success"
      );


      await routeUser(
        result.user
      );


    } catch (error) {

      console.error(
        "OTP verification error:",
        error
      );


      let message =
        "Invalid or expired OTP.";


      if (
        error.code ===
        "auth/invalid-verification-code"
      ) {

        message =
          "The OTP is incorrect.";

      } else if (
        error.code ===
        "auth/code-expired"
      ) {

        message =
          "The OTP has expired. Request a new one.";

      }


      showMessage(
        message,
        "error"
      );


    } finally {

      isProcessing = false;

      verifyOtpBtn.disabled = false;

      verifyOtpBtn.textContent =
        "Verify OTP";

    }

  }
);


// ========================================
// RESET RECAPTCHA
// ========================================

async function resetRecaptcha() {

  try {

    if (recaptchaVerifier) {

      await recaptchaVerifier.clear();

    }

  } catch (error) {

    console.log(
      "reCAPTCHA cleanup:",
      error
    );

  }


  recaptchaVerifier = null;

}


// ========================================
// AUTH STATE
// ========================================

onAuthStateChanged(
  auth,
  (user) => {

    if (!user) {
      return;
    }

    console.log(
      "Authenticated user:",
      user.uid
    );

  }
);