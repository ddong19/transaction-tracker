import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import "./styles/index.css";
import "./lib/resetDB"; // Make resetDB available globally

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
  