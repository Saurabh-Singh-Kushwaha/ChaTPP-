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
  updateDoc,
  getDocs,
  collection,
  query,
  where,
  limit
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


// ========================================
// PROFILE UID
// ========================================

const params =
  new URLSearchParams(
    window.location.search
  );

const profileUid =
  params.get("uid");

let currentUser = null;
let viewedUser = null;


// ========================================
// AUTH + PRIVACY LOCK
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


    // Other user's profile
    await setupOtherProfile();


  } catch (error) {

    console.error(
      "Profile loading error:",
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

    profileAvatar.innerHTML = `

      <img
        src="${escapeAttribute(
          viewedUser.photoURL
        )}"
        alt="Profile picture"
      >

    `;

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


  shareBtn.addEventListener(
    "click",
    shareProfile
  );


}


// ========================================
// OTHER PROFILE
// ========================================

async function setupOtherProfile() {

  const status =
    await getFriendshipStatus();


  updateButtons(
    status
  );


  shareBtn.addEventListener(
    "click",
    shareProfile
  );

}


// ========================================
// GET FRIENDSHIP STATUS
// ========================================

async function getFriendshipStatus() {

  // ----------------------------
  // Check existing friendship
  // ----------------------------

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

    return "friends";

  }


  // ----------------------------
  // Request sent by me
  // ----------------------------

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


  const sentSnapshot =
    await getDocs(
      sentQuery
    );


  if (
    !sentSnapshot.empty
  ) {

    return "sent";

  }


  // ----------------------------
  // Request received
  // ----------------------------

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


  const receivedSnapshot =
    await getDocs(
      receivedQuery
    );


  if (
    !receivedSnapshot.empty
  ) {

    return "received";

  }


  return "none";

}


// ========================================
// UPDATE BUTTONS
// ========================================

function updateButtons(
  status
) {

  // ----------------------------
  // Friends
  // ----------------------------

  if (
    status === "friends"
  ) {

    friendBtn.textContent =
      "✓ Friends";

    friendBtn.disabled =
      true;

    friendBtn.classList.add(
      "disabled"
    );


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


  // ----------------------------
  // Request sent
  // ----------------------------

  if (
    status === "sent"
  ) {

    friendBtn.textContent =
      "Request Sent";

    friendBtn.disabled =
      true;

    friendBtn.classList.add(
      "disabled"
    );


    chatBtn.style.display =
      "none";


    return;
  }


  // ----------------------------
  // Request received
  // ----------------------------

  if (
    status === "received"
  ) {

    friendBtn.textContent =
      "Accept Request";

    friendBtn.disabled =
      false;


    friendBtn.onclick =
      acceptRequest;


    chatBtn.style.display =
      "none";


    return;
  }


  // ----------------------------
  // No relationship
  // ----------------------------

  friendBtn.textContent =
    "🤝 Add Friend";

  friendBtn.disabled =
    false;


  friendBtn.onclick =
    sendFriendRequest;


  chatBtn.style.display =
    "none";

}


// ========================================
// SEND FRIEND REQUEST
// ========================================

async function sendFriendRequest() {

  if (
    !currentUser ||
    !profileUid
  ) {

    return;

  }


  if (
    currentUser.uid ===
    profileUid
  ) {

    return;

  }


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
      "Request Sent";


    alert(
      "Friend request sent!"
    );


  } catch (error) {

    console.error(
      "Send request error:",
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

async function acceptRequest() {

  try {

    friendBtn.disabled =
      true;


    // Find pending request
    const requestQuery =
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


    const snapshot =
      await getDocs(
        requestQuery
      );


    if (
      snapshot.empty
    ) {

      alert(
        "This request is no longer available."
      );

      await setupOtherProfile();

      return;
    }


    const requestDoc =
      snapshot.docs[0];


    // Create friendship
    const friendshipId =
      createFriendshipId(
        currentUser.uid,
        profileUid
      );


    await setDoc(

      doc(
        db,
        "friendships",
        friendshipId
      ),

      {

        users: [
          currentUser.uid,
          profileUid
        ],

        createdAt:
          new Date().toISOString()

      }

    );


    // Mark request accepted
    await updateDoc(

      requestDoc.ref,

      {

        status:
          "accepted",

        respondedAt:
          new Date().toISOString()

      }

    );


    alert(
      "Friend request accepted!"
    );


    // Refresh buttons
    updateButtons(
      "friends"
    );


  } catch (error) {

    console.error(
      "Accept request error:",
      error
    );


    friendBtn.disabled =
      false;


    alert(
      "Could not accept request."
    );

  }

}


// ========================================
// CREATE FRIENDSHIP ID
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

    console.log(
      "Share cancelled."
    );

  }

}


// ========================================
// ERROR
// ========================================

function showError(
  text
) {

  profileError.textContent =
    text;

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


// ========================================
// ESCAPE ATTRIBUTE
// ========================================

function escapeAttribute(
  value
) {

  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    );

}


// ========================================
// BACK BUTTON
// ========================================

document
  .getElementById("backBtn")
  .addEventListener(
    "click",
    () => {

      history.back();

    }
  );
