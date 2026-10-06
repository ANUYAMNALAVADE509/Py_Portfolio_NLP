import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  registerUser,
  loginWithGoogle
} from "../firebase/authService";

function Register() {
  const navigate = useNavigate();

  // ===================================================
  // STATE
  // ===================================================

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ===================================================
  // REGISTER WITH EMAIL AND PASSWORD
  // ===================================================

  async function handleRegister(event) {
    event.preventDefault();
    setError("");

    // VALIDATION

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!acceptedTerms) {
      setError(
        "Please accept the Terms & Conditions."
      );
      return;
    }

    setLoading(true);

    try {
      await registerUser(
        name.trim(),
        email.trim(),
        password
      );
      navigate("/overview", { replace: true });
      // App.jsx should detect the Firebase
      // authentication state and redirect
      // the authenticated user automatically.

    } catch (error) {
      console.error("REGISTER ERROR:", error);

      switch (error.code) {
        case "auth/email-already-in-use":
          setError(
            "An account already exists with this email."
          );
          break;

        case "auth/invalid-email":
          setError(
            "Please enter a valid email address."
          );
          break;

        case "auth/weak-password":
          setError("Password is too weak.");
          break;

        case "auth/network-request-failed":
          setError(
            "Network error. Check your internet connection."
          );
          break;

        default:
          setError(
            error.message || "Registration failed."
          );
      }
    } finally {
      setLoading(false);
    }
  }

  // ===================================================
  // GOOGLE AUTHENTICATION
  // ===================================================

  async function handleGoogleRegister() {
    setError("");

    if (!acceptedTerms) {
      setError(
        "Please accept the Terms & Conditions first."
      );
      return;
    }

    setLoading(true);

    try {
      await loginWithGoogle();
      navigate("/overview", { replace: true });
      // Firebase authentication state is handled
      // by App.jsx after successful authentication.

    } catch (error) {
      console.error(
        "GOOGLE REGISTER ERROR:",
        error
      );

      switch (error.code) {
        case "auth/popup-closed-by-user":
          setError("Google login was cancelled.");
          break;

        case "auth/popup-blocked":
          setError(
            "Your browser blocked the Google popup."
          );
          break;

        case "auth/network-request-failed":
          setError(
            "Network error. Check your internet connection."
          );
          break;

        default:
          setError(
            error.message ||
            "Google authentication failed."
          );
      }
    } finally {
      setLoading(false);
    }
  }

  // ===================================================
  // NAVIGATION
  // ===================================================

  function handleLogin() {
    navigate("/login");
  }

  // ===================================================
  // UI
  // ===================================================

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* LOGO */}

        <div className="auth-logo">
          QUANTRISK AI
        </div>

        {/* HEADING */}

        <h1>
          Create Account
        </h1>

        <p className="auth-subtitle">
          Create your QuantRisk AI account
        </p>

        {/* GOOGLE REGISTER */}

        <button
          className="google-button"
          type="button"
          onClick={handleGoogleRegister}
          disabled={loading}
        >
          {loading
            ? "Please wait..."
            : "Continue with Google"}
        </button>

        {/* DIVIDER */}

        <div className="divider">
          <span>OR</span>
        </div>

        {/* REGISTRATION FORM */}

        <form onSubmit={handleRegister}>

          {/* NAME */}

          <label htmlFor="register-name">
            Full Name
          </label>

          <input
            id="register-name"
            name="name"
            type="text"
            value={name}
            placeholder="Enter your full name"
            onChange={(event) =>
              setName(event.target.value)
            }
            autoComplete="name"
            required
            disabled={loading}
          />

          {/* EMAIL */}

          <label htmlFor="register-email">
            Email Address
          </label>

          <input
            id="register-email"
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

          {/* PASSWORD */}

          <label htmlFor="register-password">
            Password
          </label>

          <input
            id="register-password"
            name="password"
            type="password"
            value={password}
            placeholder="Create a password"
            onChange={(event) =>
              setPassword(event.target.value)
            }
            autoComplete="new-password"
            minLength={6}
            required
            disabled={loading}
          />

          {/* CONFIRM PASSWORD */}

          <label htmlFor="confirm-password">
            Confirm Password
          </label>

          <input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            placeholder="Confirm your password"
            onChange={(event) =>
              setConfirmPassword(event.target.value)
            }
            autoComplete="new-password"
            minLength={6}
            required
            disabled={loading}
          />

          {/* TERMS AND CONDITIONS */}

          <label className="terms">
            <input
              type="checkbox"
              name="acceptedTerms"
              checked={acceptedTerms}
              onChange={(event) =>
                setAcceptedTerms(
                  event.target.checked
                )
              }
              disabled={loading}
              required
            />

            <span>
              I agree to the Terms & Conditions
              and Privacy Policy.
            </span>
          </label>

          {/* ERROR MESSAGE */}

          {error && (
            <div
              className="error-message"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* CREATE ACCOUNT */}

          <button
            className="primary-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Creating account..."
              : "Create Account"}
          </button>

        </form>

        {/* LOGIN NAVIGATION */}

        <div className="auth-switch">
          <span>
            Already have an account?
          </span>

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
          >
            Sign In
          </button>
        </div>

      </div>
    </div>
  );
}

export default Register;

