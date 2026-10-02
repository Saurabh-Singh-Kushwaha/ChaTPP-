// js/profile.js

import {
  auth,
  db
} from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where
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
// VARIABLES
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


      // Privacy lock
      const unlocked =
        sessionStorage.getItem(
          "privacyUnlocked"
        );


      if (
        unlocked !==
        user.uid
      ) {

        window.location.href =
          "privacy-lock.html";

        return;
      }


      currentUser =
        user;


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
      "Profile error:",
      error
    );


    showError(
      "Could not load this profile."
    );

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


  if (
    viewedUser.photoURL
  ) {

    profileAvatar.innerHTML = "";


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


  shareBtn.addEventListener(
    "click",
    shareProfile
  );


  profileMenuBtn.addEventListener(
    "click",
    () => {

      alert(
        "Profile settings will be added in the account settings phase."
      );

    }
  );

}


// ========================================
// OTHER PROFILE
// ========================================

async function setupOtherProfile() {

  const status =
    await getRelationshipStatus();


  updateRelationshipUI(
    status
  );


  shareBtn.addEventListener(
    "click",
    shareProfile
  );


  profileMenuBtn.addEventListener(
    "click",
    () => {

      alert(
        "More profile options will be added later."
      );

    }
  );

}


// ========================================
// RELATIONSHIP STATUS
// ========================================

async function getRelationshipStatus() {

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


  // Request sent
  const sentQuery =
    query(

      collection(
        db,
        "friendRequests"
      ),

      where(
        "fromUid",
        "==",
        currentUser.uid
      ),

      where(
        "toUid",
        "==",
        profileUid
      ),

      where(
        "status",
        "==",
        "pending"
      ),

      limit(1)

    );


  const sentSnap =
    await getDocs(
      sentQuery
    );


  if (
    !sentSnap.empty
  ) {

    return {

      type:
        "sent",

      requestId:
        sentSnap.docs[0].id

    };

  }


  // Request received
  const receivedQuery =
    query(

      collection(
        db,
        "friendRequests"
      ),

      where(
        "fromUid",
        "==",
        profileUid
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


  const receivedSnap =
    await getDocs(
      receivedQuery
    );


  if (
    !receivedSnap.empty
  ) {

    return {

      type:
        "received",

      requestId:
        receivedSnap.docs[0].id

    };

  }


  return {
    type: "none"
  };

}


// ========================================
// UPDATE RELATIONSHIP UI
// ========================================

function updateRelationshipUI(
  relationship
) {

  chatBtn.style.display =
    "none";


  friendBtn.disabled =
    false;


  friendBtn.onclick =
    null;


  // ------------------------------
  // FRIENDS
  // ------------------------------

  if (
    relationship.type ===
    "friends"
  ) {

    friendBtn.textContent =
      "✓ Friends";


    friendBtn.disabled =
      true;


    relationshipStatus.textContent =
      "You are connected with this user.";


    chatBtn.style.display =
      "block";


    chatBtn.onclick =
      () => {

        window.location.href =
          `chat.html?uid=${
            encodeURIComponent(
              profileUid
            )
          }`;

      };


    return;
  }


  // ------------------------------
  // REQUEST SENT
  // ------------------------------

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


  // ------------------------------
  // REQUEST RECEIVED
  // ------------------------------

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


  // ------------------------------
  // NO CONNECTION
  // ------------------------------

  friendBtn.textContent =
    "🤝 Add Friend";


  friendBtn.onclick =
    sendFriendRequest;


  relationshipStatus.textContent =
    "Add this person as a friend to start chatting.";

}


// ========================================
// SEND REQUEST
// ========================================

async function sendFriendRequest() {

  try {

    friendBtn.disabled =
      true;


    const requestId =
      `${currentUser.uid}_${profileUid}`;


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
      "Friend request error:",
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

    friendBtn.disabled =
      true;


    const requestRef =
      doc(
        db,
        "friendRequests",
        requestId
      );


    const requestSnap =
      await getDoc(
        requestRef
      );


    if (
      !requestSnap.exists()
    ) {

      alert(
        "This request no longer exists."
      );

      return;

    }


    const request =
      requestSnap.data();


    // Safety check
    if (
      request.toUid !==
      currentUser.uid
    ) {

      alert(
        "You cannot accept this request."
      );

      return;

    }


    const friendshipId =
      createFriendshipId(
        currentUser.uid,
        request.fromUid
      );


    // Create friendship
    await setDoc(

      doc(
        db,
        "friendships",
        friendshipId
      ),

      {

        users: [
          currentUser.uid,
          request.fromUid
        ],

        createdAt:
          new Date().toISOString()

      }

    );


    // Mark request accepted
    await updateDoc(

      requestRef,

      {

        status:
          "accepted",

        respondedAt:
          new Date().toISOString()

      }

    );


    updateRelationshipUI({
      type: "friends"
    });


  } catch (error) {

    console.error(
      "Accept request error:",
      error
    );


    friendBtn.disabled =
      false;


    alert(
      "Could not accept the friend request."
    );

  }

}


// ========================================
// FRIENDSHIP ID
// ========================================

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
          `Check out ${
            profileHandle.textContent
          }`,

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

    // User cancelled share.
    console.log(
      "Share cancelled."
    );

  }

}


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
