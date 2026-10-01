import {
  auth,
  db
} from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


const setupSection =
  document.getElementById("setupSection");

const unlockSection =
  document.getElementById("unlockSection");

const newPin =
  document.getElementById("newPin");

const confirmPin =
  document.getElementById("confirmPin");

const unlockPin =
  document.getElementById("unlockPin");

const savePinBtn =
  document.getElementById("savePinBtn");

const unlockBtn =
  document.getElementById("unlockBtn");

const logoutBtn =
  document.getElementById("logoutBtn");

const privacyTitle =
  document.getElementById("privacyTitle");

const privacyDescription =
  document.getElementById("privacyDescription");

const privacyMessage =
  document.getElementById("privacyMessage");


let currentUser = null;

let accountHasLock = false;


// ========================================
// MESSAGE
// ========================================

function showMessage(message, type = "") {

  privacyMessage.textContent = message;

  privacyMessage.className =
    "auth-message";

  if (type) {
    privacyMessage.classList.add(type);
  }
}


// ========================================
// RANDOM SALT
// ========================================

function createSalt() {

  const bytes =
    new Uint8Array(16);

  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2, "0")
    )
    .join("");
}


// ========================================
// HASH PIN
// ========================================

async function hashPin(
  pin,
  salt
) {

  const data =
    new TextEncoder().encode(
      pin + ":" + salt
    );

  const hashBuffer =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  const hashArray =
    Array.from(
      new Uint8Array(hashBuffer)
    );

  return hashArray
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2, "0")
    )
    .join("");
}


// ========================================
// VALIDATE PIN
// ========================================

function validPin(pin) {

  return /^\d{4,6}$/.test(pin);

}


// ========================================
// CHECK LOCK
// ========================================

async function checkPrivacyLock() {

  if (!currentUser) return;


  const lockRef =
    doc(
      db,
      "privacyLocks",
      currentUser.uid
    );


  const snapshot =
    await getDoc(lockRef);


  if (snapshot.exists()) {

    accountHasLock = true;

    setupSection.classList.add(
      "hidden"
    );

    unlockSection.classList.remove(
      "hidden"
    );

    privacyTitle.textContent =
      "Unlock Privacy Lock";

    privacyDescription.textContent =
      "Enter your private PIN to access this account.";

  } else {

    accountHasLock = false;

    setupSection.classList.remove(
      "hidden"
    );

    unlockSection.classList.add(
      "hidden"
    );

    privacyTitle.textContent =
      "Create Privacy Lock";

    privacyDescription.textContent =
      "Set a private PIN for this account.";

  }

}


// ========================================
// CREATE PIN
// ========================================

savePinBtn.addEventListener(
  "click",
  async () => {

    if (!currentUser) return;


    const pin =
      newPin.value.trim();

    const confirm =
      confirmPin.value.trim();


    if (!validPin(pin)) {

      showMessage(
        "PIN 4–6 digits ka hona chahiye.",
        "error"
      );

      return;
    }


    if (pin !== confirm) {

      showMessage(
        "Dono PIN match nahi kar rahe.",
        "error"
      );

      return;
    }


    try {

      savePinBtn.disabled = true;

      savePinBtn.textContent =
        "Saving...";


      const salt =
        createSalt();


      const pinHash =
        await hashPin(
          pin,
          salt
        );


      await setDoc(
        doc(
          db,
          "privacyLocks",
          currentUser.uid
        ),
        {
          uid: currentUser.uid,

          pinHash: pinHash,

          salt: salt,

          createdAt:
            new Date().toISOString(),

          updatedAt:
            new Date().toISOString()
        }
      );


      showMessage(
        "Privacy Lock set successfully!",
        "success"
      );


      setTimeout(
        () => {

          window.location.href =
            "home.html";

        },
        700
      );


    } catch (error) {

      console.error(error);

      showMessage(
        "Privacy Lock save nahi ho paya. Try again.",
        "error"
      );


    } finally {

      savePinBtn.disabled = false;

      savePinBtn.textContent =
        "Set Privacy Lock";

    }

  }
);


// ========================================
// UNLOCK
// ========================================

unlockBtn.addEventListener(
  "click",
  async () => {

    if (!currentUser) return;


    const pin =
      unlockPin.value.trim();


    if (!validPin(pin)) {

      showMessage(
        "Apna 4–6 digit PIN enter karo.",
        "error"
      );

      return;
    }


    try {

      unlockBtn.disabled = true;

      unlockBtn.textContent =
        "Checking...";


      const lockRef =
        doc(
          db,
          "privacyLocks",
          currentUser.uid
        );


      const snapshot =
        await getDoc(lockRef);


      if (!snapshot.exists()) {

        window.location.href =
          "privacy-lock.html";

        return;
      }


      const data =
        snapshot.data();


      const enteredHash =
        await hashPin(
          pin,
          data.salt
        );


      if (
        enteredHash !==
        data.pinHash
      ) {

        showMessage(
          "Wrong Privacy PIN.",
          "error"
        );

        unlockPin.value = "";

        return;
      }


      /*
       * IMPORTANT:
       * This is only a short-lived
       * browser-session unlock state.
       *
       * It is NOT the PIN itself.
       */

      sessionStorage.setItem(
        "privacyUnlocked",
        currentUser.uid
      );


      window.location.href =
        "home.html";


    } catch (error) {

      console.error(error);

      showMessage(
        "Unlock failed. Please try again.",
        "error"
      );


    } finally {

      unlockBtn.disabled = false;

      unlockBtn.textContent =
        "Unlock";

    }

  }
);


// ========================================
// LOGOUT
// ========================================

logoutBtn.addEventListener(
  "click",
  async () => {

    try {

      sessionStorage.removeItem(
        "privacyUnlocked"
      );

      await signOut(auth);

      window.location.href =
        "index.html";

    } catch (error) {

      console.error(error);

      showMessage(
        "Logout failed.",
        "error"
      );

    }

  }
);


// ========================================
// AUTH STATE
// ========================================

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      window.location.href =
        "index.html";

      return;
    }


    currentUser = user;

    await checkPrivacyLock();

  }
);
