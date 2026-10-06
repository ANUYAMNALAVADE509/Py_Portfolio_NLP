
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { observeAuthState } from "../firebase/authService";

function ProtectedRoute({ user: externalUser, children }) {
  const hasExternalUser = externalUser !== undefined;

  const [firebaseUser, setFirebaseUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(
    !hasExternalUser
  );

  useEffect(() => {
    // If the parent supplies a user prop, use that
    // and do not start a second authentication check.
    if (hasExternalUser) {
      setCheckingAuth(false);
      return;
    }

    const unsubscribe = observeAuthState((currentUser) => {
      setFirebaseUser(currentUser);
      setCheckingAuth(false);
    });

    return unsubscribe;
  }, [hasExternalUser]);

  // Prefer the user supplied by the parent when present.
  const currentUser = hasExternalUser
    ? externalUser
    : firebaseUser;

  if (checkingAuth) {
    return (
      <div className="auth-loading">
        Checking login...
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;