import 'src/global.css';
import { useScrollToTop } from 'src/hooks/use-scroll-to-top';
import { ThemeProvider } from 'src/theme/theme-provider';
import { AuthProvider } from 'src/context/AuthContext';
import { Router as AppRouter } from 'src/routes/sections'; // ✅ Named import
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // Ensure styles are imported

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
