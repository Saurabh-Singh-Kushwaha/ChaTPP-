// js/home.js

import {
  auth,
  db
} from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


// ========================================
// ELEMENTS
// ========================================

const usersList =
  document.getElementById("usersList");

const searchInput =
  document.getElementById("searchInput");

const loadingState =
  document.getElementById("loadingState");

const emptyState =
  document.getElementById("emptyState");

const logoutBtn =
  document.getElementById("logoutBtn");

const welcomeText =
  document.getElementById("welcomeText");

const notificationBtn =
  document.getElementById("notificationBtn");


// ========================================
// VARIABLES
// ========================================

let currentUser = null;
let allUsers = [];


// ========================================
// AUTH + PRIVACY LOCK
// ========================================

onAuthStateChanged(
  auth,
  async (user) => {

    // Not logged in
    if (!user) {

      window.location.href =
        "index.html";

      return;
    }


    // Privacy Lock check
    const unlocked =
      sessionStorage.getItem(
        "privacyUnlocked"
      );


    if (unlocked !== user.uid) {

      window.location.href =
        "privacy-lock.html";

      return;
    }


    // User verified
    currentUser = user;


    // Welcome text
    if (welcomeText) {

      welcomeText.textContent =
        `Welcome, ${
          user.displayName ||
          "there"
        }`;

    }


    // Load users
    await loadUsers();

  }
);


// ========================================
// LOAD USERS
// ========================================

async function loadUsers() {

  try {

    if (loadingState) {
      loadingState.classList.remove(
        "hidden"
      );
    }


    if (emptyState) {
      emptyState.classList.add(
        "hidden"
      );
    }


    if (usersList) {

      usersList.innerHTML = "";

    }


    // IMPORTANT:
    // No orderBy() here.
    // We sort locally instead.

    const snapshot =
      await getDocs(
        collection(
          db,
          "users"
        )
      );


    allUsers = [];


    snapshot.forEach(
      (userDoc) => {

        const user =
          userDoc.data();


        // Don't show current user
        if (
          userDoc.id ===
          currentUser.uid
        ) {

          return;

        }


        allUsers.push({

          uid:
            userDoc.id,

          ...user

        });

      }
    );


    // Sort alphabetically
    allUsers.sort(
      (a, b) => {

        const nameA =
          (
            a.displayName ||
            ""
          ).toLowerCase();

        const nameB =
          (
            b.displayName ||
            ""
          ).toLowerCase();

        return nameA.localeCompare(
          nameB
        );

      }
    );


    renderUsers(
      allUsers
    );


  } catch (error) {

    console.error(
      "FIRESTORE USERS ERROR:",
      error
    );


    if (usersList) {

      usersList.innerHTML = `

        <div class="error-box">

          <strong>
            Could not load users.
          </strong>

          <br><br>

          Please check your
          Firebase connection
          and Firestore rules.

        </div>

      `;

    }

  } finally {

    if (loadingState) {

      loadingState.classList.add(
        "hidden"
      );

    }

  }

}


// ========================================
// RENDER USERS
// ========================================

function renderUsers(
  users
) {

  if (!usersList) {
    return;
  }


  usersList.innerHTML = "";


  if (!users.length) {

    if (emptyState) {

      emptyState.classList.remove(
        "hidden"
      );

    }

    return;
  }


  if (emptyState) {

    emptyState.classList.add(
      "hidden"
    );

  }


  users.forEach(
    (user) => {

      const card =
        document.createElement(
          "button"
        );


      card.className =
        "user-card";

      card.type =
        "button";


      // ================================
      // AVATAR
      // ================================

      const avatar =
        document.createElement(
          "div"
        );


      avatar.className =
        "user-avatar";


      if (user.photoURL) {

        const image =
          document.createElement(
            "img"
          );


        image.src =
          user.photoURL;

        image.alt =
          "";


        avatar.appendChild(
          image
        );

      } else {

        avatar.textContent =
          getInitials(
            user.displayName ||
            "User"
          );

      }


      // ================================
      // INFORMATION
      // ================================

      const information =
        document.createElement(
          "div"
        );


      information.className =
        "user-information";


      const name =
        document.createElement(
          "strong"
        );


      name.textContent =
        user.displayName ||
        "User";


      const handle =
        document.createElement(
          "span"
        );


      handle.textContent =
        user.handle
          ? "@" + user.handle
          : "";


      information.appendChild(
        name
      );

      information.appendChild(
        handle
      );


      // ================================
      // CARD
      // ================================

      card.appendChild(
        avatar
      );

      card.appendChild(
        information
      );


      // ================================
      // OPEN PROFILE
      // ================================

      card.addEventListener(
        "click",
        () => {

          window.location.href =
            `profile.html?uid=${
              encodeURIComponent(
                user.uid
              )
            }`;

        }
      );


      usersList.appendChild(
        card
      );

    }
  );

}


// ========================================
// SEARCH
// ========================================

if (searchInput) {

  searchInput.addEventListener(
    "input",
    () => {

      const term =
        searchInput.value
          .trim()
          .toLowerCase()
          .replace(
            /^@/,
            ""
          );


      // Empty search
      if (!term) {

        renderUsers(
          allUsers
        );

        return;
      }


      const filtered =
        allUsers.filter(
          (user) => {

            const name =
              (
                user.displayName ||
                ""
              ).toLowerCase();


            const handle =
              (
                user.handle ||
                ""
              ).toLowerCase();


            return (
              name.includes(
                term
              ) ||
              handle.includes(
                term
              )
            );

          }
        );


      renderUsers(
        filtered
      );

    }
  );

}


// ========================================
// LOGOUT
// ========================================

if (logoutBtn) {

  logoutBtn.addEventListener(
    "click",
    async () => {

      try {

        // Remove privacy unlock
        sessionStorage.removeItem(
          "privacyUnlocked"
        );


        await signOut(
          auth
        );


        window.location.href =
          "index.html";


      } catch (error) {

        console.error(
          "Logout error:",
          error
        );


        alert(
          "Could not log out. Please try again."
        );

      }

    }
  );

}


// ========================================
// NOTIFICATIONS
// ========================================

if (notificationBtn) {

  notificationBtn.addEventListener(
    "click",
    () => {

      alert(
        "Friend requests will appear here."
      );

    }
  );

}


// ========================================
// HELPERS
// ========================================

function getInitials(
  name
) {

  return String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      word =>
        word
          .charAt(0)
          .toUpperCase()
    )
    .join("");

}
