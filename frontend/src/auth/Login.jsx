import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  loginUser,
  loginWithGoogle
} from "../firebase/authService";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ===================================================
  // EMAIL LOGIN
  // ===================================================

  async function handleLogin(event) {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      await loginUser(email.trim(), password);
      navigate("/overview", { replace: true });

      // Firebase authentication state is handled
      // automatically by App.jsx.
      // Do not navigate manually here if App.jsx
      // already redirects authenticated users.

    } catch (error) {
      console.error("LOGIN ERROR:", error);

      switch (error.code) {
        case "auth/invalid-credential":
          setError("Invalid email or password.");
          break;

        case "auth/user-not-found":
          setError("No account exists with this email.");
          break;

        case "auth/wrong-password":
          setError("Incorrect password.");
          break;

        case "auth/invalid-email":
          setError("Please enter a valid email.");
          break;

        case "auth/too-many-requests":
          setError("Too many attempts. Try again later.");
          break;

        case "auth/network-request-failed":
          setError(
            "Network error. Check your internet connection."
          );
          break;

        default:
          setError(error.message || "Login failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  // ===================================================
  // GOOGLE LOGIN
  // ===================================================

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);

    try {
      await loginWithGoogle();
      navigate("/overview", { replace: true });
      // App.jsx handles the authentication state
      // and redirects the user after successful login.

    } catch (error) {
      console.error("GOOGLE LOGIN ERROR:", error);

      if (error.code === "auth/popup-closed-by-user") {
        setError("Google login was cancelled.");
      } else if (error.code === "auth/popup-blocked") {
        setError(
          "Your browser blocked the Google popup."
        );
      } else {
        setError(error.message || "Google login failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  // ===================================================
  // NAVIGATION
  // ===================================================

  function handleRegister() {
    navigate("/register");
  }

  function handleForgotPassword() {
    navigate("/forgot-password");
  }

  // ===================================================
  // UI
  // ===================================================

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-logo">
          QUANTRISK AI
        </div>

        <h1>
          Welcome Back
        </h1>

        <p className="auth-subtitle">
          Sign in to your QuantRisk AI account
        </p>

        {/* GOOGLE LOGIN */}

        <button
          className="google-button"
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          {loading
            ? "Please wait..."
            : "Continue with Google"}
        </button>

        <div className="divider">
          <span>OR</span>
        </div>

        {/* EMAIL LOGIN FORM */}

        <form onSubmit={handleLogin}>

          <label htmlFor="login-email">
            Email Address
          </label>

          <input
            id="login-email"
            name="email"
            type="email"
            value={email}
            placeholder="Enter your email"
            onChange={(event) =>
              setEmail(event.target.value)
            }
            autoComplete="email"
            required
            disabled={loading}
          />

          <label htmlFor="login-password">
            Password
          </label>

          <input
            id="login-password"
            name="password"
            type="password"
            value={password}
            placeholder="Enter your password"
            onChange={(event) =>
              setPassword(event.target.value)
            }
            autoComplete="current-password"
            required
            disabled={loading}
          />

          {/* FORGOT PASSWORD */}

          <button
            type="button"
            className="forgot-button"
            onClick={handleForgotPassword}
            disabled={loading}
          >
            Forgot Password?
          </button>

          {/* ERROR MESSAGE */}

          {error && (
            <div
              className="error-message"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* SIGN IN */}

          <button
            className="primary-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </button>

        </form>

        {/* REGISTER NAVIGATION */}

        <div className="auth-switch">

          <span>
            Don't have an account?
          </span>

          <button
            type="button"
            onClick={handleRegister}
            disabled={loading}
          >
            Create Account
          </button>

        </div>

      </div>
    </div>
  );
}

export default Login;

