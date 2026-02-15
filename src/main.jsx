import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { AuthProvider } from "./contexts/AuthContext"
import { UserProvider } from "./contexts/UserContext"
// V7 Design System (MUST load before components to prevent FOUC)
import './docudent/v7/app/v7.design.css';
import App from "./App"
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/plus-jakarta-sans";
import "./index.css"

// DEV-only: Initialize module import error capture
import { initDevErrorCapture } from './utils/devErrorCapture';
initDevErrorCapture();


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <UserProvider>
          <App />
        </UserProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)