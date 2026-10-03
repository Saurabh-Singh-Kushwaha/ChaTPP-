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
  getDoc,
  setDoc,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


// ========================================
// ELEMENTS
// ========================================

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

const relationshipStatus =
  document.getElementById(
    "relationshipStatus"
  );

const backBtn =
  document.getElementById("backBtn");

const profileMenuBtn =
  document.getElementById(
    "profileMenuBtn"
  );

const profileMenu =
  document.getElementById(
    "profileMenu"
  );

const copyProfileLinkBtn =
  document.getElementById(
    "copyProfileLinkBtn"
  );

const copyHandleBtn =
  document.getElementById(
    "copyHandleBtn"
  );

const closeMenuBtn =
  document.getElementById(
    "closeMenuBtn"
  );


// ========================================
// PROFILE UID
// ========================================

const params =
  new URLSearchParams(
    window.location.search
  );

const profileUid =
  params.get("uid");


// ========================================
// STATE
// ========================================

let currentUser = null;
let viewedUser = null;


// ========================================
// AUTH
// ========================================

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


      currentUser =
        user;


      // Privacy lock
      const unlocked =
        sessionStorage.getItem(
          "privacyUnlocked"
        );


      if (
        unlocked !== user.uid
      ) {

        window.location.href =
          "privacy-lock.html";

        return;
      }


      await loadProfile();

    }
  );

}


// ========================================
// LOAD PROFILE
// ========================================

async function loadProfile() {

  try {

    const userRef =
      doc(
        db,
        "users",
        profileUid
      );


    const snapshot =
      await getDoc(
        userRef
      );


    if (!snapshot.exists()) {

      showError(
        "This user profile does not exist."
      );

      return;
    }


    viewedUser =
      snapshot.data();


    renderProfile();


    // Own profile
    if (
      profileUid ===
      currentUser.uid
    ) {

      setupOwnProfile();

      return;
    }


    // Other user
    await setupOtherProfile();


  } catch (error) {

    console.error(
      "Profile loading error:",
      error
    );


    /*
      IMPORTANT:

      Profile itself loaded successfully.
      So relationship failure should not
      destroy the whole profile page.
    */

    renderProfile();


    relationshipStatus.textContent =
      "Friend options are temporarily unavailable.";

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
      ? "@" + viewedUser.handle
      : "";


  profileBio.textContent =
    viewedUser.bio ||
    "No bio yet.";


  profileAvatar.innerHTML =
    "";


  if (
    viewedUser.photoURL
  ) {

    const img =
      document.createElement(
        "img"
      );


    img.src =
      viewedUser.photoURL;

    img.alt =
      "Profile picture";


    profileAvatar.appendChild(
      img
    );

  } else {

    profileAvatar.textContent =
      getInitials(
        viewedUser.displayName ||
        "User"
      );

  }

}


// ========================================
// OWN PROFILE
// ========================================

function setupOwnProfile() {

  friendBtn.style.display =
    "none";


  chatBtn.style.display =
    "none";


  relationshipStatus.textContent =
    "This is your profile.";

}


// ========================================
// OTHER USER
// ========================================

async function setupOtherProfile() {

  try {

    const status =
      await getRelationshipStatus();


    updateRelationshipUI(
      status
    );

  } catch (error) {

    console.error(
      "Relationship check error:",
      error
    );


    /*
      Never show the profile error
      just because relationship lookup
      failed.
    */

    friendBtn.style.display =
      "block";


    friendBtn.disabled =
      false;


    friendBtn.textContent =
      "🤝 Add Friend";


    friendBtn.onclick =
      sendFriendRequest;


    relationshipStatus.textContent =
      "Add this person as a friend to start chatting.";

  }

}


// ========================================
// RELATIONSHIP STATUS
// ========================================

async function getRelationshipStatus() {

  /*
    Friendship ID is always generated
    from both UIDs in sorted order.
  */

  const friendshipId =
    createFriendshipId(
      currentUser.uid,
      profileUid
    );


  const friendshipRef =
    doc(
      db,
      "friendships",
      friendshipId
    );


  const friendshipSnap =
    await getDoc(
      friendshipRef
    );


  if (
    friendshipSnap.exists()
  ) {

    return {
      type: "friends"
    };

  }


  /*
    Request sent by current user
  */

  const sentRequestId =
    createRequestId(
      currentUser.uid,
      profileUid
    );


  const sentRequestRef =
    doc(
      db,
      "friendRequests",
      sentRequestId
    );


  const sentRequestSnap =
    await getDoc(
      sentRequestRef
    );


  if (
    sentRequestSnap.exists()
  ) {

    const data =
      sentRequestSnap.data();


    if (
      data.status ===
      "pending"
    ) {

      return {

        type:
          "sent",

        requestId:
          sentRequestId

      };

    }

  }


  /*
    Request received from viewed user
  */

  const receivedRequestId =
    createRequestId(
      profileUid,
      currentUser.uid
    );


  const receivedRequestRef =
    doc(
      db,
      "friendRequests",
      receivedRequestId
    );


  const receivedRequestSnap =
    await getDoc(
      receivedRequestRef
    );


  if (
    receivedRequestSnap.exists()
  ) {

    const data =
      receivedRequestSnap.data();


    if (
      data.status ===
      "pending"
    ) {

      return {

        type:
          "received",

        requestId:
          receivedRequestId

      };

    }

  }


  return {
    type: "none"
  };

}


// ========================================
// UPDATE UI
// ========================================

function updateRelationshipUI(
  relationship
) {

  chatBtn.style.display =
    "none";


  friendBtn.style.display =
    "block";


  friendBtn.disabled =
    false;


  friendBtn.onclick =
    null;


  // FRIENDS
  if (
    relationship.type ===
    "friends"
  ) {

    friendBtn.textContent =
      "✓ Friends";


    friendBtn.disabled =
      true;


    relationshipStatus.textContent =
      "You are connected with this user. Chat will be enabled in the chat phase.";


    chatBtn.style.display =
      "none";


    return;
  }


  // REQUEST SENT
  if (
    relationship.type ===
    "sent"
  ) {

    friendBtn.textContent =
      "⏳ Request Sent";


    friendBtn.disabled =
      true;


    relationshipStatus.textContent =
      "Waiting for this user to accept your request.";

    return;
  }


  // REQUEST RECEIVED
  if (
    relationship.type ===
    "received"
  ) {

    friendBtn.textContent =
      "✅ Accept Request";


    friendBtn.onclick =
      () => {

        acceptRequest(
          relationship.requestId
        );

      };


    relationshipStatus.textContent =
      "This user has sent you a friend request.";

    return;
  }


  // NO CONNECTION
  friendBtn.textContent =
    "🤝 Add Friend";


  friendBtn.onclick =
    sendFriendRequest;


  relationshipStatus.textContent =
    "Add this person as a friend to start chatting.";

}


// ========================================
// SEND FRIEND REQUEST
// ========================================

async function sendFriendRequest() {

  try {

    friendBtn.disabled =
      true;


    const requestId =
      createRequestId(
        currentUser.uid,
        profileUid
      );


    const requestRef =
      doc(
        db,
        "friendRequests",
        requestId
      );


    await setDoc(
      requestRef,
      {

        fromUid:
          currentUser.uid,

        toUid:
          profileUid,

        status:
          "pending",

        createdAt:
          new Date().toISOString()

      }
    );


    friendBtn.textContent =
      "⏳ Request Sent";


    relationshipStatus.textContent =
      "Friend request sent. Waiting for acceptance.";

  } catch (error) {

    console.error(
      "Send friend request error:",
      error
    );


    friendBtn.disabled =
      false;


    alert(
      "Could not send friend request."
    );

  }

}


// ========================================
// ACCEPT REQUEST
// ========================================

async function acceptRequest(
  requestId
) {

  try {

    friendBtn.disabled = true;

    const requestRef = doc(db, "friendRequests", requestId);
    const friendshipId = createFriendshipId(currentUser.uid, profileUid);
    const friendshipRef = doc(db, "friendships", friendshipId);

    await runTransaction(db, async (transaction) => {

      const requestSnap = await transaction.get(requestRef);

      if (!requestSnap.exists()) {
        throw new Error("REQUEST_NOT_FOUND");
      }

      const request = requestSnap.data();

      if (request.toUid !== currentUser.uid || request.status !== "pending") {
        throw new Error("REQUEST_INVALID");
      }

      transaction.update(requestRef, {
        status: "accepted",
        respondedAt: new Date().toISOString()
      });

      transaction.set(friendshipRef, {
        users: [
          currentUser.uid,
          request.fromUid
        ].sort(),
        createdAt: new Date().toISOString()
      });
    });

    updateRelationshipUI({
      type: "friends"
    });

  } catch (error) {

    console.error("Accept request error:", error);
    friendBtn.disabled = false;

    if (error.message === "REQUEST_NOT_FOUND") {
      alert("This request is no longer available.");
    } else if (error.message === "REQUEST_INVALID") {
      alert("This request can no longer be accepted.");
    } else {
      alert("Could not accept this request.");
    }

  }
}


// ========================================
// IDs
// ========================================

function createRequestId(
  fromUid,
  toUid
) {

  return `${fromUid}_${toUid}`;

}


function createFriendshipId(
  uid1,
  uid2
) {

  return [
    uid1,
    uid2
  ]
    .sort()
    .join("_");

}


// ========================================
// SHARE PROFILE
// ========================================

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
          `Check out ${profileHandle.textContent}`,

        url:
          url

      });

    } else {

      await navigator.clipboard.writeText(
        url
      );


      alert(
        "Profile link copied."
      );

    }

  } catch (error) {

    console.log(
      "Share cancelled."
    );

  }

}


// ========================================
// THREE DOT MENU
// ========================================

profileMenuBtn.addEventListener(
  "click",
  (event) => {

    event.stopPropagation();


    const isOpen =
      profileMenu.classList.contains(
        "show"
      );


    profileMenu.classList.toggle(
      "show"
    );


    profileMenuBtn.setAttribute(
      "aria-expanded",
      String(!isOpen)
    );

  }
);


// Copy profile link
copyProfileLinkBtn.addEventListener(
  "click",
  async () => {

    try {

      await navigator.clipboard.writeText(
        window.location.href
      );


      closeProfileMenu();


      alert(
        "Profile link copied."
      );

    } catch (error) {

      alert(
        "Could not copy profile link."
      );

    }

  }
);


// Copy handle
copyHandleBtn.addEventListener(
  "click",
  async () => {

    try {

      const handle =
        profileHandle.textContent;


      await navigator.clipboard.writeText(
        handle
      );


      closeProfileMenu();


      alert(
        "Handle copied."
      );

    } catch (error) {

      alert(
        "Could not copy handle."
      );

    }

  }
);


// Close menu
closeMenuBtn.addEventListener(
  "click",
  closeProfileMenu
);


function closeProfileMenu() {

  profileMenu.classList.remove(
    "show"
  );


  profileMenuBtn.setAttribute(
    "aria-expanded",
    "false"
  );

}


// Click outside menu
document.addEventListener(
  "click",
  (event) => {

    if (
      !event.target.closest(
        ".profile-menu-wrapper"
      )
    ) {

      closeProfileMenu();

    }

  }
);


// ========================================
// BACK
// ========================================

backBtn.addEventListener(
  "click",
  () => {

    if (
      window.history.length > 1
    ) {

      history.back();

    } else {

      window.location.href =
        "home.html";

    }

  }
);


// ========================================
// ERROR
// ========================================

function showError(
  message
) {

  profileError.textContent =
    message;


  profileError.classList.remove(
    "hidden"
  );

}


// ========================================
// INITIALS
// ========================================

function getInitials(
  name
) {

  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
      word =>
        word
          .charAt(0)
          .toUpperCase()
    )
    .join("");

}
