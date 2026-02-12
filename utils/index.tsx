import { Navigate } from "react-router-dom";

export const PrivateRoute = ({ children, redirectTo }) => {
  const token = localStorage.getItem("token");
  const isAdmin = localStorage.getItem("isAdminAuthenticated") === "true";

  // Check: Is there ANY proof of login?
  const isAuthenticated = token || isAdmin;

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};
export const PublicRoute = ({ children, redirectTo }) => {
  const token = localStorage.getItem("token");
  const isAdmin = localStorage.getItem("isAdminAuthenticated") === "true";

  // Check: Is there ANY proof of login?
  const isAuthenticated = token || isAdmin;

  if (isAuthenticated) {
    // If logged in, don't let them stay on Login/Signup
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};
