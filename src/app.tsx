import 'src/global.css';
import { useScrollToTop } from 'src/hooks/use-scroll-to-top';
import { ThemeProvider } from 'src/theme/theme-provider';
import { AuthProvider } from 'src/context/AuthContext';
import { Router as AppRouter } from 'src/routes/sections'; 
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; 
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://8375301ae290dc7f364f382e9d2c96ad@o4510460575219712.ingest.us.sentry.io/4510460577447936",
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
});

export default function App() {
  useScrollToTop();

  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastContainer position="bottom-center" autoClose={5000} />
        <AppRouter />
      </ThemeProvider>
    </AuthProvider>
  );
}
