import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  onSnapshot,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


// ========================================
// ELEMENTS
// ========================================

const usersList =
  document.getElementById("usersList");

const userSearch =
  document.getElementById("userSearch");

const myProfileBtn =
  document.getElementById("myProfileBtn");

const notificationsBtn =
  document.getElementById("notificationsBtn");

const notificationsPanel =
  document.getElementById("notificationsPanel");

const requestList =
  document.getElementById("requestList");

const requestBadge =
  document.getElementById("requestBadge");


// ========================================
// VARIABLES
// ========================================

let currentUser = null;
let allUsers = [];


// ========================================
// AUTH + PRIVACY LOCK CHECK
// ========================================

onAuthStateChanged(
  auth,
  async (user) => {

    // User is not logged in
    if (!user) {

      window.location.href =
        "index.html";

      return;
    }


    // Check Privacy Lock
    const unlocked =
      sessionStorage.getItem(
        "privacyUnlocked"
      );


    // Privacy lock is not unlocked
    if (unlocked !== user.uid) {

      window.location.href =
        "privacy-lock.html";

      return;
    }


    // Everything is okay
    currentUser = user;


    // Load users
    await loadUsers();


    // Listen for incoming requests
    listenForFriendRequests();

  }
);


// ========================================
// LOAD REAL REGISTERED USERS
// ========================================

async function loadUsers() {

  try {

    usersList.innerHTML = `
      <p class="muted">
        Loading users...
      </p>
    `;


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

        // Don't show yourself
        if (
          userDoc.id ===
          currentUser.uid
        ) {
          return;
        }


        const data =
          userDoc.data();


        allUsers.push({

          id:
            userDoc.id,

          ...data

        });

      }
    );


    renderUsers(
      allUsers
    );


  } catch (error) {

    console.error(
      "Load users error:",
      error
    );


    usersList.innerHTML = `
      <p class="auth-message error">
        Could not load users.
      </p>
    `;

  }

}


// ========================================
// RENDER USERS
// ========================================

function renderUsers(users) {

  if (!users.length) {

    usersList.innerHTML = `
      <p class="muted">
        No other users found.
      </p>
    `;

    return;
  }


  usersList.innerHTML = "";


  users.forEach(
    (user) => {

      const card =
        document.createElement(
          "button"
        );


      card.type = "button";

      card.className =
        "user-card";


      const photo =
        user.photoURL ||
        "";


      card.innerHTML = `

        <div class="user-avatar">

          ${
            photo

              ? `
                <img
                  src="${escapeAttribute(
                    photo
                  )}"
                  alt=""
                >
              `

              : "👤"
          }

        </div>


        <div class="user-info">

          <strong>
            ${escapeHTML(
              user.displayName ||
              "User"
            )}
          </strong>


          <span>
            ${
              user.handle
                ? "@"
                + escapeHTML(
                    user.handle
                  )
                : ""
            }
          </span>


          ${
            user.bio

              ? `
                <small>
                  ${escapeHTML(
                    user.bio
                  )}
                </small>
              `

              : ""
          }

        </div>

      `;


      card.addEventListener(
        "click",
        () => {

          window.location.href =
            `profile.html?uid=${
              encodeURIComponent(
                user.id
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
// USER SEARCH
// ========================================

userSearch.addEventListener(
  "input",
  () => {

    const search =
      userSearch.value
        .trim()
        .toLowerCase()
        .replace(/^@/, "");


    // Empty search
    if (!search) {

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
            )
            .toLowerCase();


          const handle =
            (
              user.handle ||
              ""
            )
            .toLowerCase();


          return (

            name.includes(
              search
            )

            ||

            handle.includes(
              search
            )

          );

        }
      );


    renderUsers(
      filtered
    );

  }
);


// ========================================
// MY PROFILE
// ========================================

myProfileBtn.addEventListener(
  "click",
  () => {

    if (!currentUser) {
      return;
    }


    window.location.href =
      `profile.html?uid=${
        encodeURIComponent(
          currentUser.uid
        )
      }`;

  }
);


// ========================================
// NOTIFICATIONS BUTTON
// ========================================

notificationsBtn.addEventListener(
  "click",
  () => {

    notificationsPanel.classList.toggle(
      "hidden"
    );

  }
);


// ========================================
// FRIEND REQUEST LISTENER
// ========================================

function listenForFriendRequests() {

  const requestsQuery =
    query(

      collection(
        db,
        "friendRequests"
      ),

      where(
        "toUid",
        "==",
        currentUser.uid
      ),

      where(
        "status",
        "==",
        "pending"
      )

    );


  onSnapshot(
    requestsQuery,
    async (snapshot) => {

      // Number of requests
      requestBadge.textContent =
        snapshot.size;


      // No requests
      if (snapshot.empty) {

        requestBadge.classList.add(
          "hidden"
        );


        requestList.innerHTML = `
          <p class="muted">
            No pending requests.
          </p>
        `;

        return;
      }


      // Show notification badge
      requestBadge.classList.remove(
        "hidden"
      );


      requestList.innerHTML = "";


      for (
        const requestDoc
        of snapshot.docs
      ) {

        const request =
          requestDoc.data();


        // Get sender profile
        const senderRef =
          doc(
            db,
            "users",
            request.fromUid
          );


        const senderSnap =
          await getDoc(
            senderRef
          );


        if (!senderSnap.exists()) {
          continue;
        }


        const sender =
          senderSnap.data();


        const item =
          document.createElement(
            "div"
          );


        item.className =
          "friend-request";


        item.innerHTML = `

          <div class="request-user">

            <strong>
              ${escapeHTML(
                sender.displayName ||
                "User"
              )}
            </strong>


            <span>
              ${
                sender.handle
                  ? "@"
                    +
                    escapeHTML(
                      sender.handle
                    )
                  : ""
              }
            </span>

          </div>


          <div class="request-actions">

            <button
              class="accept-request"
              type="button"
            >
              Accept
            </button>


            <button
              class="reject-request"
              type="button"
            >
              Reject
            </button>

          </div>

        `;


        // Accept
        item
          .querySelector(
            ".accept-request"
          )
          .addEventListener(
            "click",
            () => {

              updateRequest(
                requestDoc.id,
                "accepted"
              );

            }
          );


        // Reject
        item
          .querySelector(
            ".reject-request"
          )
          .addEventListener(
            "click",
            () => {

              updateRequest(
                requestDoc.id,
                "rejected"
              );

            }
          );


        requestList.appendChild(
          item
        );

      }

    },

    (error) => {

      console.error(
        "Friend request listener error:",
        error
      );

    }

  );

}


// ========================================
// UPDATE FRIEND REQUEST
// ========================================

async function updateRequest(
  requestId,
  status
) {

  try {

    await updateDoc(

      doc(
        db,
        "friendRequests",
        requestId
      ),

      {

        status:
          status,

        respondedAt:
          new Date().toISOString()

      }

    );


  } catch (error) {

    console.error(
      "Update request error:",
      error
    );


    alert(
      "Could not update friend request."
    );

  }

}


// ========================================
// ESCAPE HTML
// ========================================

function escapeHTML(
  value
) {

  return String(value)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}


// ========================================
// ESCAPE ATTRIBUTE
// ========================================

function escapeAttribute(
  value
) {

  return escapeHTML(
    value
  );

}
