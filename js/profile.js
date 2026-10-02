import {
  auth,
  db
} from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  query,
  collection,
  where,
  getDocs,
  limit
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


const profileName =
  document.getElementById(
    "profileName"
  );

const profileHandle =
  document.getElementById(
    "profileHandle"
  );

const profileBio =
  document.getElementById(
    "profileBio"
  );

const profileAvatar =
  document.getElementById(
    "profileAvatar"
  );

const profileActions =
  document.getElementById(
    "profileActions"
  );

const backBtn =
  document.getElementById(
    "backBtn"
  );


let currentUser = null;
let viewedUid = null;
let viewedUser = null;


// ========================================
// GET UID
// ========================================

const params =
  new URLSearchParams(
    window.location.search
  );


viewedUid =
  params.get("uid");


// ========================================
// BACK
// ========================================

backBtn.addEventListener(
  "click",
  () => {

    window.history.back();

  }
);


// ========================================
// AUTH
// ========================================

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      window.location.href =
        "index.html";

      return;
    }


    const unlocked =
      sessionStorage.getItem(
        "privacyUnlocked"
      );


    if (unlocked !== user.uid) {

      window.location.href =
        "privacy-lock.html";

      return;
    }


    currentUser = user;


    if (!viewedUid) {

      viewedUid =
        currentUser.uid;

    }


    await loadProfile();

  }
);


// ========================================
// LOAD PROFILE
// ========================================

async function loadProfile() {

  try {

    const userRef =
      doc(
        db,
        "users",
        viewedUid
      );


    const snapshot =
      await getDoc(
        userRef
      );


    if (!snapshot.exists()) {

      profileName.textContent =
        "User not found";

      profileActions.innerHTML =
        "";

      return;
    }


    viewedUser =
      snapshot.data();


    renderProfile();


    if (
      viewedUid ===
      currentUser.uid
    ) {

      renderOwnProfileActions();

    } else {

      await renderOtherProfileActions();

    }


  } catch (error) {

    console.error(error);

    profileName.textContent =
      "Could not load profile.";

  }

}


// ========================================
// RENDER PROFILE
// ========================================

function renderProfile() {

  profileName.textContent =
    viewedUser.displayName ||
    "User";


  profileHandle.textContent =
    viewedUser.handle
      ? `@${viewedUser.handle}`
      : "";


  profileBio.textContent =
    viewedUser.bio ||
    "";


  if (viewedUser.photoURL) {

    profileAvatar.innerHTML =
      `<img
        src="${escapeAttribute(
          viewedUser.photoURL
        )}"
        alt=""
      >`;

  } else {

    profileAvatar.textContent =
      "👤";

  }

}


// ========================================
// OWN PROFILE
// ========================================

function renderOwnProfileActions() {

  profileActions.innerHTML = `

    <button
      id="editProfileBtn"
      class="primary-btn"
      type="button"
    >
      Edit Profile
    </button>

    <button
      id="settingsBtn"
      class="secondary-btn"
      type="button"
    >
      Settings
    </button>

  `;


  document
    .getElementById(
      "editProfileBtn"
    )
    .addEventListener(
      "click",
      () => {

        window.location.href =
          "edit-profile.html";

      }
    );


  document
    .getElementById(
      "settingsBtn"
    )
    .addEventListener(
      "click",
      () => {

        window.location.href =
          "settings.html";

      }
    );

}


// ========================================
// OTHER PROFILE
// ========================================

async function renderOtherProfileActions() {

  const friendship =
    await getFriendshipStatus(
      currentUser.uid,
      viewedUid
    );


  if (
    friendship ===
    "friends"
  ) {

    profileActions.innerHTML = `

      <button
        id="chatBtn"
        class="primary-btn"
        type="button"
      >
        💬 Chat
      </button>

      <button
        id="shareProfileBtn"
        class="secondary-btn"
        type="button"
      >
        Share Profile
      </button>

    `;


    document
      .getElementById(
        "chatBtn"
      )
      .addEventListener(
        "click",
        () => {

          window.location.href =
            `chat.html?uid=${encodeURIComponent(
              viewedUid
            )}`;

        }
      );


  } else if (
    friendship ===
    "request_sent"
  ) {

    profileActions.innerHTML = `

      <button
        class="secondary-btn"
        type="button"
        disabled
      >
        Request Sent
      </button>

      <button
        id="shareProfileBtn"
        class="secondary-btn"
        type="button"
      >
        Share Profile
      </button>

    `;


  } else if (
    friendship ===
    "request_received"
  ) {

    profileActions.innerHTML = `

      <button
        id="acceptBtn"
        class="primary-btn"
        type="button"
      >
        Accept Request
      </button>

      <button
        id="shareProfileBtn"
        class="secondary-btn"
        type="button"
      >
        Share Profile
      </button>

    `;


    document
      .getElementById(
        "acceptBtn"
      )
      .addEventListener(
        "click",
        acceptIncomingRequest
      );


  } else {

    profileActions.innerHTML = `

      <button
        id="addFriendBtn"
        class="primary-btn"
        type="button"
      >
        Add Friend
      </button>

      <button
        id="shareProfileBtn"
        class="secondary-btn"
        type="button"
      >
        Share Profile
      </button>

    `;


    document
      .getElementById(
        "addFriendBtn"
      )
      .addEventListener(
        "click",
        sendFriendRequest
      );

  }


  const shareBtn =
    document.getElementById(
      "shareProfileBtn"
    );


  if (shareBtn) {

    shareBtn.addEventListener(
      "click",
      shareProfile
    );

  }

}


// ========================================
// FRIENDSHIP STATUS
// ========================================

async function getFriendshipStatus(
  uid1,
  uid2
) {

  const firstId =
    `${uid1}_${uid2}`;

  const secondId =
    `${uid2}_${uid1}`;


  const friendRef =
    doc(
      db,
      "friendships",
      getFriendshipId(
        uid1,
        uid2
      )
    );


  const friendSnap =
    await getDoc(
      friendRef
    );


  if (friendSnap.exists()) {

    return "friends";

  }


  const sentSnap =
    await getDocs(
      query(
        collection(
          db,
          "friendRequests"
        ),
        where(
          "fromUid",
          "==",
          uid1
        ),
        where(
          "toUid",
          "==",
          uid2
        ),
        where(
          "status",
          "==",
          "pending"
        ),
        limit(1)
      )
    );


  if (!sentSnap.empty) {

    return "request_sent";

  }


  const receivedSnap =
    await getDocs(
      query(
        collection(
          db,
          "friendRequests"
        ),
        where(
          "fromUid",
          "==",
          uid2
        ),
        where(
          "toUid",
          "==",
          uid1
        ),
        where(
          "status",
          "==",
          "pending"
        ),
        limit(1)
      )
    );


  if (!receivedSnap.empty) {

    return "request_received";

  }


  return "none";

}


// ========================================
// SEND REQUEST
// ========================================

async function sendFriendRequest() {

  const requestId =
    `${currentUser.uid}_${viewedUid}`;


  try {

    await setDoc(
      doc(
        db,
        "friendRequests",
        requestId
      ),
      {

        fromUid:
          currentUser.uid,

        toUid:
          viewedUid,

        status:
          "pending",

        createdAt:
          new Date().toISOString()

      }
    );


    alert(
      "Friend request sent!"
    );


    await renderOtherProfileActions();


  } catch (error) {

    console.error(error);

    alert(
      "Could not send request."
    );

  }

}


// ========================================
// ACCEPT REQUEST
// ========================================

async function acceptIncomingRequest() {

  try {

    const requestQuery =
      query(
        collection(
          db,
          "friendRequests"
        ),
        where(
          "fromUid",
          "==",
          viewedUid
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
        ),
        limit(1)
      );


    const snapshot =
      await getDocs(
        requestQuery
      );


    if (snapshot.empty) {

      alert(
        "Request no longer exists."
      );

      return;

    }


    const requestDoc =
      snapshot.docs[0];


    await setDoc(
      doc(
        db,
        "friendships",
        getFriendshipId(
          currentUser.uid,
          viewedUid
        )
      ),
      {

        users: [
          currentUser.uid,
          viewedUid
        ],

        createdAt:
          new Date().toISOString()

      }
    );


    await setDoc(
      requestDoc.ref,
      {

        status:
          "accepted",

        respondedAt:
          new Date().toISOString()

      },
      {
        merge: true
      }
    );


    await renderOtherProfileActions();


  } catch (error) {

    console.error(error);

    alert(
      "Could not accept request."
    );

  }

}


// ========================================
// FRIENDSHIP ID
// ========================================

function getFriendshipId(
  uid1,
  uid2
) {

  return [uid1, uid2]
    .sort()
    .join("_");

}


// ========================================
// SHARE PROFILE
// ========================================

async function shareProfile() {

  const profileUrl =
    `${window.location.origin}/profile.html?uid=${encodeURIComponent(
      viewedUid
    )}`;


  try {

    if (
      navigator.share
    ) {

      await navigator.share({

        title:
          viewedUser.displayName,

        text:
          `Check out @${viewedUser.handle}`,

        url:
          profileUrl

      });

    } else {

      await navigator.clipboard.writeText(
        profileUrl
      );

      alert(
        "Profile link copied!"
      );

    }

  } catch (error) {

    console.log(
      "Share cancelled."
    );

  }

}


// ========================================
// ESCAPE
// ========================================

function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function escapeAttribute(value) {

  return escapeHTML(value);

}
