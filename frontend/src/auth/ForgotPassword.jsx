import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  resetPassword
} from "../firebase/authService";

function ForgotPassword() {
const navigate = useNavigate();
  const [email, setEmail] =
    useState("");

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  async function handleSubmit(event) {

    event.preventDefault();

    setError("");
    setMessage("");


    if (!email.trim()) {

      setError(
        "Please enter your email address."
      );

      return;
    }


    setLoading(true);


    try {

      await resetPassword(
        email.trim()
      );


      setMessage(
        "Password reset email sent. Please check your inbox."
      );

    } catch (error) {

      console.error(
        "RESET PASSWORD ERROR:",
        error
      );


      switch (error.code) {

        case "auth/invalid-email":

          setError(
            "Please enter a valid email."
          );

          break;


        case "auth/user-not-found":

          setError(
            "No account exists with this email."
          );

          break;


        default:

          setError(
            error.message ||
            "Unable to send reset email."
          );

      }

    } finally {

      setLoading(false);

    }

  }


  return (

    <div className="auth-page">

      <div className="auth-card">

        <div className="auth-logo">
          QUANTRISK AI
        </div>


        <h1>
          Reset Password
        </h1>


        <p className="auth-subtitle">
          Enter your email address and
          we'll send you a reset link.
        </p>


        <form onSubmit={handleSubmit}>

          <label>
            Email Address
          </label>

          <input
            type="email"
            value={email}
            placeholder="Enter your email"
            onChange={(event) =>
              setEmail(event.target.value)
            }
            disabled={loading}
          />


          {error && (

            <div className="error-message">
              {error}
            </div>

          )}


          {message && (

            <div className="success-message">
              {message}
            </div>

          )}


          <button
            className="primary-button"
            type="submit"
            disabled={loading}
          >

            {loading
              ? "Sending..."
              : "Send Reset Link"}

          </button>

        </form>


        <div className="auth-switch">

        <button
        type="button"
        onClick={() => navigate("/login", { replace: true })}
        >
      Back to Sign In
      </button>

        </div>

      </div>

    </div>

  );
}


export default ForgotPassword;