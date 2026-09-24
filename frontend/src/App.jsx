import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ProblemList from "./pages/ProblemList";
import ReportProblem from "./pages/ReportProblem";
import ProblemDetail from "./pages/ProblemDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";

function Nav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isActive = (path) => location.pathname === path;

  const linkClass = (path) =>
    `relative px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
      isActive(path) ? "text-white" : "text-navy-200 hover:text-white"
    }`;

  return (
    <header className="sticky top-0 z-20 bg-navy-500 shadow-md shadow-navy-900/20">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-saffron-500 font-display text-sm font-bold text-navy-800">
            PV
          </span>
          <span>
            <span className="block font-display text-lg font-semibold leading-tight text-white">
              Prajaa Vaani
            </span>
            <span className="hidden text-[11px] leading-tight text-navy-200 sm:block">
              people's voice
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link to="/" className={linkClass("/")}>
            Problems
            {isActive("/") && (
              <motion.span layoutId="nav-underline" className="absolute inset-x-2 -bottom-[13px] h-0.5 rounded-full bg-saffron-500" />
            )}
          </Link>
          <Link to="/report" className={linkClass("/report")}>
            Report a Problem
            {isActive("/report") && (
              <motion.span layoutId="nav-underline" className="absolute inset-x-2 -bottom-[13px] h-0.5 rounded-full bg-saffron-500" />
            )}
          </Link>

          <span className="mx-1 hidden h-5 w-px bg-navy-400 sm:block" />

          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-navy-200 sm:inline">
                {user.displayName || user.email}
              </span>
              <button
                onClick={async () => { await logout(); navigate("/"); }}
                className="rounded-lg border border-navy-400 px-3 py-1.5 text-xs font-medium text-navy-100 hover:bg-navy-600"
              >
                Log out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="rounded-lg bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-navy-900 hover:bg-saffron-400"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function Shell() {
  const location = useLocation();
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <Nav />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <Routes location={location}>
              <Route path="/" element={<ProblemList />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route
                path="/report"
                element={
                  <ProtectedRoute>
                    <ReportProblem />
                  </ProtectedRoute>
                }
              />
              <Route path="/problem/:id" element={<ProblemDetail />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="border-t border-navy-100 bg-cream-100 py-4 text-center text-xs text-navy-400">
        Prajaa Vaani — no problem gets ignored in silence.
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
