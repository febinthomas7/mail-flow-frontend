import { createBrowserRouter } from "react-router-dom";
// import { PrivateRoute, PublicRoute } from "../utils"; // ⬅️ import it
import SendEmail from "@/pages/SendEmail";
import VerifyEmail from "@/pages/VerifyEmail";
import CheckEmail from "@/pages/checkEmail/TargetVerifier";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/login";
import Home from "@/pages/Home";
import Layout from "@/component/Layout";
import { PrivateRoute, PublicRoute } from "@/utils";

const router = createBrowserRouter([
  {
    path: "/send-email",
    element: (
      <PrivateRoute redirectTo="/login">
        <Layout>
          <SendEmail />
        </Layout>
      </PrivateRoute>
    ),
  },
  {
    path: "/verify-email",
    element: (
      <PrivateRoute redirectTo="/login">
        <Layout>
          <VerifyEmail />
        </Layout>
      </PrivateRoute>
    ),
  },
  {
    path: "/verify-target",
    element: (
      <PrivateRoute redirectTo="/login">
        <Layout>
          <CheckEmail />
        </Layout>
      </PrivateRoute>
    ),
  },
  {
    path: "/",
    element: (
      <PublicRoute redirectTo="/send-email">
        <Login />
      </PublicRoute>
    ),
  },

  { path: "*", element: <NotFound /> },
]);

export default router;
