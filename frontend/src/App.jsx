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

function AppRoutes() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

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
            <Navigate to="/overview" replace />
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
            <Navigate to="/overview" replace />
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
            <Navigate to="/overview" replace />
          ) : (
            <ForgotPassword />
          )
        }
      />

      {/* AUTHENTICATED APPLICATION */}
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

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}