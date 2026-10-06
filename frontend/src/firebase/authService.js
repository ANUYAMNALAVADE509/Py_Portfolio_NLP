
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";

import { auth } from "./firebase";

// =====================================================
// VALIDATION
// =====================================================

function cleanEmail(email) {
  if (typeof email !== "string" || !email.trim()) {
    throw new Error("Please enter your email address.");
  }

  return email.trim();
}

function checkPassword(password) {
  if (typeof password !== "string" || !password) {
    throw new Error("Please enter your password.");
  }

  return password;
}

// =====================================================
// REGISTER
// =====================================================

export async function registerUser(name, email, password) {
  const cleanName =
    typeof name === "string" ? name.trim() : "";

  if (!cleanName) {
    throw new Error("Please enter your name.");
  }

  const credential = await createUserWithEmailAndPassword(
    auth,
    cleanEmail(email),
    checkPassword(password)
  );

  await updateProfile(credential.user, {
    displayName: cleanName,
  });

  return credential.user;
}

// =====================================================
// LOGIN
// =====================================================

export async function loginUser(email, password) {
  const credential = await signInWithEmailAndPassword(
    auth,
    cleanEmail(email),
    checkPassword(password)
  );

  return credential.user;
}

// =====================================================
// GOOGLE LOGIN
// =====================================================

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();

  provider.setCustomParameters({
    prompt: "select_account",
  });

  const credential = await signInWithPopup(
    auth,
    provider
  );

  return credential.user;
}

// =====================================================
// LOGOUT
// =====================================================

export async function logoutUser() {
  await signOut(auth);
}

// =====================================================
// PASSWORD RESET
// =====================================================

export async function resetPassword(email) {
  await sendPasswordResetEmail(
    auth,
    cleanEmail(email)
  );
}

// =====================================================
// AUTH STATE LISTENER
// =====================================================

export function observeAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

// =====================================================
// CURRENT USER
// =====================================================

export function getCurrentUser() {
  return auth.currentUser;
}