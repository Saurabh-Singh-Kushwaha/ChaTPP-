// js/profile-setup.js

import {
  auth,
  db
} from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  doc,
  runTransaction,
  serverTimestamp,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


const form =
  document.getElementById("profileForm");

const message =
  document.getElementById("setupMessage");

const saveButton =
  document.getElementById("saveProfileBtn");


let currentUser = null;


function showMessage(text, type = "") {

  message.textContent = text;

  message.className = "auth-message";

  if (type) {
    message.classList.add(type);
  }

}


function normalizeHandle(value) {

  return value
    .trim()
    .toLowerCase()
    .replace(/^@/, "");

}


function validHandle(handle) {

  return /^[a-z0-9_]{3,25}$/.test(handle);

}


onAuthStateChanged(auth, async (user) => {

  if (!user) {

    window.location.href = "index.html";

    return;
  }

  currentUser = user;


  // If profile already exists,
  // don't let the user recreate it.

  const userRef =
    doc(db, "users", user.uid);

  const snapshot =
    await getDoc(userRef);


  if (snapshot.exists()) {

    window.location.href = "home.html";

  }

});


form.addEventListener("submit", async (event) => {

  event.preventDefault();


  if (!currentUser) {

    showMessage(
      "Authentication is not ready yet.",
      "error"
    );

    return;
  }


  const displayName =
    document.getElementById("displayName")
      .value
      .trim();


  const handle =
    normalizeHandle(
      document.getElementById("handle").value
    );


  const bio =
    document.getElementById("bio")
      .value
      .trim();


  if (displayName.length < 2) {

    showMessage(
      "Display name must contain at least 2 characters.",
      "error"
    );

    return;
  }


  if (!validHandle(handle)) {

    showMessage(
      "Handle must be 3–25 characters and use only letters, numbers or underscores.",
      "error"
    );

    return;
  }


  try {

    saveButton.disabled = true;

    saveButton.textContent = "Creating profile...";

    showMessage("Checking handle...");


    const userRef =
      doc(db, "users", currentUser.uid);

    const handleRef =
      doc(db, "handles", handle);


    await runTransaction(
      db,
      async (transaction) => {

        const existingHandle =
          await transaction.get(handleRef);

        const existingUser =
          await transaction.get(userRef);


        if (existingUser.exists()) {

          throw new Error(
            "PROFILE_ALREADY_EXISTS"
          );

        }


        if (existingHandle.exists()) {

          throw new Error(
            "HANDLE_TAKEN"
          );

        }


        transaction.set(
          userRef,
          {
            uid: currentUser.uid,

            email:
              currentUser.email || null,

            phoneNumber:
              currentUser.phoneNumber || null,

            displayName,

            handle,

            bio,

            photoURL:
              currentUser.photoURL || "",

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp()
          }
        );


        transaction.set(
          handleRef,
          {
            uid: currentUser.uid,

            handle,

            createdAt:
              serverTimestamp()
          }
        );

      }
    );


    showMessage(
      "Profile created successfully!",
      "success"
    );


    setTimeout(() => {

      window.location.href = "home.html";

    }, 500);


  } catch (error) {

    console.error(error);


    if (error.message === "HANDLE_TAKEN") {

      showMessage(
        "That handle is already taken. Choose another one.",
        "error"
      );

    } else if (
      error.message === "PROFILE_ALREADY_EXISTS"
    ) {

      window.location.href = "home.html";

    } else {

      showMessage(
        "Could not create your profile. Please try again.",
        "error"
      );

    }

  } finally {

    saveButton.disabled = false;

    saveButton.textContent = "Continue";

  }

});