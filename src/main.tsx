import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import "./styles/index.css";
import "./lib/resetDB"; // Make resetDB available globally

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        if (import.meta.env.DEV) {
          console.log('Service Worker registered successfully:', registration.scope);
        }
      })
      .catch((error) => {
        // Always log errors, even in production
        console.error('Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
  