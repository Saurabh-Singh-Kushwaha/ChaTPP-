import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  collection,
  getDocs,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const usersList = document.getElementById("usersList");
const searchInput = document.getElementById("userSearch");
const logoutBtn = document.getElementById("logoutBtn");
const notificationsBtn = document.getElementById("notificationsBtn");
const myProfileBtn = document.getElementById("myProfileBtn");
const notificationsPanel = document.getElementById("notificationsPanel");
const requestList = document.getElementById("requestList");
const requestBadge = document.getElementById("requestBadge");

let currentUser = null;
let allUsers = [];
let unsubscribeRequests = null;

function getInitials(name) {
  return String(name || "User")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join("");
}

function renderUsers(users) {
  if (!usersList) return;
  usersList.innerHTML = "";

  if (!users.length) {
    usersList.innerHTML = '<p class="muted empty-state">No users found.</p>';
    return;
  }

  users.forEach(user => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "user-card";

    const avatar = document.createElement("div");
    avatar.className = "user-avatar";
    if (user.photoURL) {
      const image = document.createElement("img");
      image.src = user.photoURL;
      image.alt = "";
      image.loading = "lazy";
      avatar.appendChild(image);
    } else {
      avatar.textContent = getInitials(user.displayName);
    }

    const information = document.createElement("div");
    information.className = "user-information";
    const name = document.createElement("strong");
    name.textContent = user.displayName || "User";
    const handle = document.createElement("span");
    handle.textContent = user.handle ? `@${user.handle}` : "";
    information.append(name, handle);
    card.append(avatar, information);

    card.addEventListener("click", () => {
      window.location.href = `profile.html?uid=${encodeURIComponent(user.uid)}`;
    });

    usersList.appendChild(card);
  });
}

async function loadUsers() {
  try {
    usersList.innerHTML = '<p class="muted loading-state">Loading users...</p>';
    const snapshot = await getDocs(collection(db, "users"));
    allUsers = snapshot.docs
      .filter(userDoc => userDoc.id !== currentUser.uid)
      .map(userDoc => ({ uid: userDoc.id, ...userDoc.data() }))
      .sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
    renderUsers(allUsers);
  } catch (error) {
    console.error("FIRESTORE USERS ERROR:", error);
    usersList.innerHTML = '<div class="error-box"><strong>Could not load users.</strong><br><br>Please check your Firebase connection and Firestore rules.</div>';
  }
}

function renderRequests(requests) {
  if (!requestList || !requestBadge) return;
  requestBadge.textContent = String(requests.length);
  requestBadge.classList.toggle("hidden", requests.length === 0);
  requestList.innerHTML = "";

  if (!requests.length) {
    requestList.innerHTML = '<p class="muted">No pending friend requests.</p>';
    return;
  }

  requests.forEach(request => {
    const item = document.createElement("div");
    item.className = "request-card";

    const text = document.createElement("div");
    text.className = "request-text";
    text.textContent = `Friend request from @${request.fromUid.slice(0, 8)}…`;

    const open = document.createElement("button");
    open.type = "button";
    open.className = "secondary-btn small-btn";
    open.textContent = "Open";
    open.addEventListener("click", () => {
      window.location.href = `profile.html?uid=${encodeURIComponent(request.fromUid)}`;
    });

    item.append(text, open);
    requestList.appendChild(item);
  });
}

function watchFriendRequests() {
  if (unsubscribeRequests) unsubscribeRequests();
  const requestsQuery = query(
    collection(db, "friendRequests"),
    where("toUid", "==", currentUser.uid)
  );
  unsubscribeRequests = onSnapshot(requestsQuery, snapshot => {
    const requests = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(request => request.status === "pending");
    renderRequests(requests);
  }, error => {
    console.error("Friend request listener error:", error);
    renderRequests([]);
  });
}

searchInput?.addEventListener("input", () => {
  const term = searchInput.value.trim().toLowerCase().replace(/^@/, "");
  if (!term) return renderUsers(allUsers);
  renderUsers(allUsers.filter(user =>
    String(user.displayName || "").toLowerCase().includes(term) ||
    String(user.handle || "").toLowerCase().includes(term)
  ));
});

notificationsBtn?.addEventListener("click", () => {
  notificationsPanel?.classList.toggle("hidden");
});

myProfileBtn?.addEventListener("click", () => {
  if (currentUser) window.location.href = `profile.html?uid=${encodeURIComponent(currentUser.uid)}`;
});

logoutBtn?.addEventListener("click", async () => {
  try {
    sessionStorage.removeItem("privacyUnlocked");
    await signOut(auth);
    window.location.href = "index.html";
  } catch (error) {
    console.error("Logout error:", error);
    alert("Could not log out. Please try again.");
  }
});

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  if (sessionStorage.getItem("privacyUnlocked") !== user.uid) {
    window.location.href = "privacy-lock.html";
    return;
  }

  currentUser = user;
  await loadUsers();
  watchFriendRequests();
});
