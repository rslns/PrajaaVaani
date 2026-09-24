import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      navigate(location.state?.from?.pathname || "/");
    } catch (err) {
      setError("Couldn't log in — check your email and password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-sm space-y-4 rounded-2xl border border-navy-100 bg-white p-6 shadow-sm"
    >
      <h1 className="font-display text-xl font-semibold text-navy-800">Log in</h1>
      <input
        required
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm focus:border-saffron-400 focus:outline-none focus:ring-2 focus:ring-saffron-100"
      />
      <input
        required
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm focus:border-saffron-400 focus:outline-none focus:ring-2 focus:ring-saffron-100"
      />
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-saffron-500 py-2.5 text-sm font-semibold text-navy-900 hover:bg-saffron-400 disabled:opacity-60"
      >
        {submitting ? "Logging in…" : "Log in"}
      </button>
      <p className="text-center text-xs text-navy-400">
        New here?{" "}
        <Link to="/signup" className="font-semibold text-saffron-600 hover:underline">
          Create an account
        </Link>
      </p>
    </motion.form>
  );
}
