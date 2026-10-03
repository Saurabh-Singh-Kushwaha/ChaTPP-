import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const setupSection = document.getElementById("setupSection");
const unlockSection = document.getElementById("unlockSection");
const newPin = document.getElementById("newPin");
const confirmPin = document.getElementById("confirmPin");
const unlockPin = document.getElementById("unlockPin");
const savePinBtn = document.getElementById("savePinBtn");
const unlockBtn = document.getElementById("unlockBtn");
const logoutBtn = document.getElementById("logoutBtn");
const privacyTitle = document.getElementById("privacyTitle");
const privacyDescription = document.getElementById("privacyDescription");
const privacyMessage = document.getElementById("privacyMessage");

let currentUser = null;
let hasLock = false;
let busy = false;

function showMessage(text = "", type = "") {
  privacyMessage.textContent = text;
  privacyMessage.className = "auth-message";
  if (type) privacyMessage.classList.add(type);
}

function createSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

async function hashPin(pin, salt) {
  const data = new TextEncoder().encode(`${pin}:${salt}`);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, "0")).join("");
}

function validPin(pin) {
  return /^\d{4,6}$/.test(pin);
}

async function getAccountState() {
  const lockSnap = await getDoc(doc(db, "privacyLocks", currentUser.uid));
  const profileSnap = await getDoc(doc(db, "users", currentUser.uid));
  return { lockExists: lockSnap.exists(), profileExists: profileSnap.exists() };
}

async function routeAfterUnlock() {
  sessionStorage.setItem("privacyUnlocked", currentUser.uid);
  const { profileExists } = await getAccountState();
  window.location.href = profileExists ? "home.html" : "profile-setup.html";
}

async function checkPrivacyLock() {
  const state = await getAccountState();
  hasLock = state.lockExists;

  if (hasLock) {
    setupSection.classList.add("hidden");
    unlockSection.classList.remove("hidden");
    privacyTitle.textContent = "Unlock Privacy Lock";
    privacyDescription.textContent = "Enter your private PIN to access this account.";
    if (sessionStorage.getItem("privacyUnlocked") === currentUser.uid) {
      window.location.href = state.profileExists ? "home.html" : "profile-setup.html";
    }
  } else {
    setupSection.classList.remove("hidden");
    unlockSection.classList.add("hidden");
    privacyTitle.textContent = "Create Privacy Lock";
    privacyDescription.textContent = "Set a private PIN before entering your account.";
  }
}

savePinBtn?.addEventListener("click", async () => {
  if (!currentUser || busy) return;
  const pin = newPin.value.trim();
  const confirm = confirmPin.value.trim();

  if (!validPin(pin)) return showMessage("PIN must contain 4–6 digits.", "error");
  if (pin !== confirm) return showMessage("Both PINs must match.", "error");

  try {
    busy = true;
    savePinBtn.disabled = true;
    savePinBtn.textContent = "Saving...";

    const salt = createSalt();
    const pinHash = await hashPin(pin, salt);

    await setDoc(doc(db, "privacyLocks", currentUser.uid), {
      uid: currentUser.uid,
      pinHash,
      salt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await routeAfterUnlock();
  } catch (error) {
    console.error("Privacy lock setup error:", error);
    showMessage("Could not save Privacy Lock. Please try again.", "error");
  } finally {
    busy = false;
    savePinBtn.disabled = false;
    savePinBtn.textContent = "Set Privacy Lock";
  }
});

unlockBtn?.addEventListener("click", async () => {
  if (!currentUser || busy) return;
  const pin = unlockPin.value.trim();
  if (!validPin(pin)) return showMessage("Enter your 4–6 digit PIN.", "error");

  try {
    busy = true;
    unlockBtn.disabled = true;
    unlockBtn.textContent = "Checking...";

    const snapshot = await getDoc(doc(db, "privacyLocks", currentUser.uid));
    if (!snapshot.exists()) {
      await checkPrivacyLock();
      return;
    }

    const data = snapshot.data();
    const enteredHash = await hashPin(pin, data.salt);

    if (enteredHash !== data.pinHash) {
      unlockPin.value = "";
      showMessage("Wrong Privacy PIN.", "error");
      return;
    }

    await routeAfterUnlock();
  } catch (error) {
    console.error("Privacy unlock error:", error);
    showMessage("Unlock failed. Please try again.", "error");
  } finally {
    busy = false;
    unlockBtn.disabled = false;
    unlockBtn.textContent = "Unlock";
  }
});

logoutBtn?.addEventListener("click", async () => {
  try {
    sessionStorage.removeItem("privacyUnlocked");
    await signOut(auth);
    window.location.href = "index.html";
  } catch (error) {
    console.error("Logout error:", error);
    showMessage("Logout failed.", "error");
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = user;
  try {
    await checkPrivacyLock();
  } catch (error) {
    console.error("Privacy state error:", error);
    showMessage("Could not check your Privacy Lock. Please refresh.", "error");
  }
});
