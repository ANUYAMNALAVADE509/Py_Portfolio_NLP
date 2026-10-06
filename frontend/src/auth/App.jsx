
import React, { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase/firebase";

import Login from "./auth/Login";
import Register from "./auth/Register";
import ForgotPassword from "./auth/ForgotPassword";
import QuantRiskApp from "./auth/QuantRiskApp";

import "./App.css";
import "./auth/Auth.css";

// =====================================================
// APPLICATION ROUTES
// =====================================================

function AppRoutes() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Listen for Firebase authentication changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setCheckingAuth(false);
      },
      (error) => {
        console.error("Authentication state error:", error);
        setUser(null);
        setCheckingAuth(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Wait until Firebase has checked the current session
  if (checkingAuth) {
    return (
      <div className="auth-loading">
        Checking login...
      </div>
    );
  }

  return (
    <Routes>
      {/* LOGIN */}
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/" replace />
          ) : (
            <Login />
          )
        }
      />

      {/* REGISTER */}
      <Route
        path="/register"
        element={
          user ? (
            <Navigate to="/" replace />
          ) : (
            <Register />
          )
        }
      />

      {/* FORGOT PASSWORD */}
      <Route
        path="/forgot-password"
        element={
          user ? (
            <Navigate to="/" replace />
          ) : (
            <ForgotPassword />
          )
        }
      />

      {/* PROTECTED APPLICATION */}
      <Route
        path="/*"
        element={
          user ? (
            <QuantRiskApp user={user} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

// =====================================================
// MAIN APP
// =====================================================

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}