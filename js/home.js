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
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


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


let currentUser = null;
let allUsers = [];


/* --------------------------------
   AUTH CHECK
-------------------------------- */

onAuthStateChanged(auth, async (user) => {

  if (!user) {

    window.location.href = "index.html";

    return;
  }

  currentUser = user;

  await loadUsers();

});


/* --------------------------------
   LOAD USERS
-------------------------------- */

async function loadUsers() {

  try {

    loadingState.classList.remove("hidden");

    emptyState.classList.add("hidden");


    const usersQuery =
      query(
        collection(db, "users"),
        orderBy("displayName")
      );


    const snapshot =
      await getDocs(usersQuery);


    allUsers = [];


    snapshot.forEach((document) => {

      const user = document.data();

      // Don't show yourself in the
      // people discovery list.

      if (
        user.uid !== currentUser.uid
      ) {

        allUsers.push(user);

      }

    });


    renderUsers(allUsers);


  } catch (error) {

    console.error(error);

    usersList.innerHTML = `
      <div class="error-box">
        Could not load users.
        Please refresh and try again.
      </div>
    `;

  } finally {

    loadingState.classList.add("hidden");

  }

}


/* --------------------------------
   RENDER USERS
-------------------------------- */

function renderUsers(users) {

  usersList.innerHTML = "";


  if (users.length === 0) {

    emptyState.classList.remove("hidden");

    return;

  }


  emptyState.classList.add("hidden");


  users.forEach((user) => {

    const card =
      document.createElement("button");

    card.className = "user-card";

    card.type = "button";


    const avatar =
      document.createElement("div");

    avatar.className = "user-avatar";


    if (user.photoURL) {

      avatar.innerHTML = `
        <img
          src="${escapeAttribute(user.photoURL)}"
          alt=""
        >
      `;

    } else {

      avatar.textContent =
        getInitials(
          user.displayName || "User"
        );

    }


    const information =
      document.createElement("div");

    information.className =
      "user-information";


    const name =
      document.createElement("strong");

    name.textContent =
      user.displayName || "User";


    const handle =
      document.createElement("span");

    handle.textContent =
      "@" + (user.handle || "");


    information.appendChild(name);
    information.appendChild(handle);


    card.appendChild(avatar);
    card.appendChild(information);


    card.addEventListener("click", () => {

      window.location.href =
        `profile.html?uid=${encodeURIComponent(user.uid)}`;

    });


    usersList.appendChild(card);

  });

}


/* --------------------------------
   SEARCH
-------------------------------- */

searchInput.addEventListener(
  "input",
  () => {

    const term =
      searchInput.value
        .trim()
        .toLowerCase()
        .replace(/^@/, "");


    if (!term) {

      renderUsers(allUsers);

      return;

    }


    const filtered =
      allUsers.filter((user) => {

        const name =
          (
            user.displayName || ""
          ).toLowerCase();

        const handle =
          (
            user.handle || ""
          ).toLowerCase();


        return (
          name.includes(term) ||
          handle.includes(term)
        );

      });


    renderUsers(filtered);

  }
);


/* --------------------------------
   LOGOUT
-------------------------------- */

logoutBtn.addEventListener(
  "click",
  async () => {

    try {

      await signOut(auth);

      window.location.href =
        "index.html";

    } catch (error) {

      console.error(error);

      alert(
        "Could not log out. Please try again."
      );

    }

  }
);


/* --------------------------------
   NOTIFICATIONS
-------------------------------- */

document
  .getElementById("notificationBtn")
  .addEventListener("click", () => {

    alert(
      "Notifications will be connected in the next build phase."
    );

  });


/* --------------------------------
   HELPERS
-------------------------------- */

function getInitials(name) {

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      word => word.charAt(0).toUpperCase()
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