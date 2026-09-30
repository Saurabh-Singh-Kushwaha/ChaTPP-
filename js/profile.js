// js/profile.js

import {
  auth,
  db
} from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


const profileName =
  document.getElementById("profileName");

const profileHandle =
  document.getElementById("profileHandle");

const profileBio =
  document.getElementById("profileBio");

const profileAvatar =
  document.getElementById("profileAvatar");

const profileError =
  document.getElementById("profileError");

const chatBtn =
  document.getElementById("chatBtn");

const friendBtn =
  document.getElementById("friendBtn");

const shareBtn =
  document.getElementById("shareBtn");


const params =
  new URLSearchParams(
    window.location.search
  );


const profileUid =
  params.get("uid");


if (!profileUid) {

  showError(
    "No user profile was specified."
  );

} else {

  onAuthStateChanged(
    auth,
    async (user) => {

      if (!user) {

        window.location.href =
          "index.html";

        return;

      }


      await loadProfile();

    }
  );

}


/* --------------------------------
   LOAD PROFILE
-------------------------------- */

async function loadProfile() {

  try {

    const userRef =
      doc(
        db,
        "users",
        profileUid
      );


    const snapshot =
      await getDoc(userRef);


    if (!snapshot.exists()) {

      showError(
        "This user profile does not exist."
      );

      return;

    }


    const user =
      snapshot.data();


    profileName.textContent =
      user.displayName || "User";


    profileHandle.textContent =
      user.handle
        ? "@" + user.handle
        : "";


    profileBio.textContent =
      user.bio || "No bio yet.";


    if (user.photoURL) {

      profileAvatar.innerHTML = `
        <img
          src="${escapeAttribute(user.photoURL)}"
          alt="Profile picture"
        >
      `;

    } else {

      profileAvatar.textContent =
        getInitials(
          user.displayName || "User"
        );

    }


    chatBtn.addEventListener(
      "click",
      () => {

        alert(
          "Chat will be connected in the next build phase."
        );

      }
    );


    friendBtn.addEventListener(
      "click",
      () => {

        alert(
          "Friend requests will be connected in the next build phase."
        );

      }
    );


    shareBtn.addEventListener(
      "click",
      shareProfile
    );


  } catch (error) {

    console.error(error);

    showError(
      "Could not load this profile."
    );

  }

}


/* --------------------------------
   SHARE
-------------------------------- */

async function shareProfile() {

  const url =
    window.location.href;


  try {

    if (
      navigator.share
    ) {

      await navigator.share({

        title:
          profileName.textContent,

        text:
          `Check out @${profileHandle.textContent.replace("@", "")}`,

        url

      });

    } else {

      await navigator.clipboard.writeText(url);

      alert(
        "Profile link copied."
      );

    }

  } catch (error) {

    console.log(
      "Share cancelled or unavailable."
    );

  }

}


/* --------------------------------
   HELPERS
-------------------------------- */

function showError(text) {

  profileError.textContent = text;

  profileError.classList.remove(
    "hidden"
  );

}


function getInitials(name) {

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      word =>
        word.charAt(0).toUpperCase()
    )
    .join("");

}


function escapeAttribute(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

}


document
  .getElementById("backBtn")
  .addEventListener(
    "click",
    () => {

      history.back();

    }
  );