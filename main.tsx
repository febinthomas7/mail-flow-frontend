import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import router from "./routes";
import { MailProvider } from "./utils/MailContext";
// import FallBack from "./components/FallBack";
// import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <MailProvider>
    <RouterProvider router={router} />
  </MailProvider>,
);
