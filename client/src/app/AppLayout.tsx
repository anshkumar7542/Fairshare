import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileWarning, FileUp, LayoutDashboard, Lightbulb, LogOut, Moon, Plus, SearchCheck, Sparkles, Sun, Users, WalletCards } from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { useToast } from "../components/Toast";
import { useAuth } from "../features/auth/AuthProvider";
import { useDemoMode } from "../features/demo/demoMode";

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [theme, setTheme] = useState(() => localStorage.getItem("fairshare-theme") || "light");
  const demoMode = useDemoMode();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("fairshare-theme", theme);
  }, [theme]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-cloud text-ink transition-colors duration-300">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="sticky top-0 z-30 border-b border-line/70 bg-surface/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/dashboard" className="group inline-flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-ink text-sm font-black text-cloud shadow-lg transition group-hover:-translate-y-0.5">
              FS
            </span>
            <span>
              <span className="block text-sm font-bold leading-tight text-ink">FairShare</span>
              <span className="hidden text-xs text-muted sm:block">Flatmate expense intelligence</span>
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1 rounded-lg border border-line bg-elevated/55 p-1">
            <NavItem to="/dashboard" icon={<LayoutDashboard size={16} />} label="Dashboard" />
            <NavItem to="/groups/new" icon={<Plus size={16} />} label="Group" />
            <NavItem to="/imports" icon={<FileUp size={16} />} label="Import" />
            <Button
              variant={demoMode.enabled ? "primary" : "secondary"}
              className="min-h-9 px-3"
              onClick={() => {
                const next = !demoMode.enabled;
                demoMode.toggle();
                showToast({
                  tone: next ? "success" : "info",
                  title: next ? "Demo Mode enabled" : "Demo Mode disabled",
                  body: next ? "Aisha's guided evaluation data is ready." : "The app is back to normal API-backed mode."
                });
                navigate("/dashboard");
              }}
              aria-label="Toggle demo mode"
            >
              <Sparkles size={16} /> <span className="hidden sm:inline">Demo</span>
            </Button>
            <span className="hidden items-center gap-2 rounded-md px-3 py-2 text-sm text-muted md:inline-flex">
              <Users size={16} /> {user?.name}
            </span>
            <Button
              variant="ghost"
              className="min-h-9 px-3"
              onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
            <Button variant="ghost" onClick={handleLogout} aria-label="Log out">
              <LogOut size={16} /> Logout
            </Button>
          </nav>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        {demoMode.enabled && <DemoModeBar />}
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function DemoModeBar() {
  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-mint/30 bg-mint/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-surface/80 px-3 py-1 text-xs font-bold text-mint">
            <Sparkles size={14} /> Demo Mode on
          </div>
          <p className="mt-3 text-lg font-bold text-ink">45-minute evaluation walkthrough</p>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            Use the quick links to show the messy CSV story, Rohan's rupee-by-rupee explanation, Aisha's settlement answer, and the generated import report.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <DemoLink to="/imports?demo=anomalies" icon={<FileWarning size={15} />} label="CSV anomalies" />
          <DemoLink to="/groups/demo-flat/balances/demo-rohan" icon={<SearchCheck size={15} />} label="Balance why" />
          <DemoLink to="/groups/demo-flat/recommendations" icon={<WalletCards size={15} />} label="Who pays whom" />
          <DemoLink to="/imports?demo=report" icon={<FileUp size={15} />} label="Import report" />
        </div>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-3">
        <DemoTip title="1. Start" body="Open CSV anomalies and explain the no-silent-guessing policy." />
        <DemoTip title="2. Prove" body="Open Rohan's balance and trace the running total." />
        <DemoTip title="3. Close" body="Open who pays whom and record one settlement." />
      </div>
    </section>
  );
}

function DemoLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-line bg-surface px-3 text-sm font-bold text-ink transition hover:-translate-y-0.5 hover:border-mint"
    >
      {icon} {label}
    </Link>
  );
}

function DemoTip({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-line bg-surface/70 p-3">
      <p className="inline-flex items-center gap-2 text-sm font-bold text-ink">
        <Lightbulb size={14} className="text-mint" /> {title}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted">{body}</p>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink
      className={({ isActive }) =>
        `focus-ring inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
          isActive ? "bg-surface text-ink shadow-sm" : "text-muted hover:bg-surface/70 hover:text-ink"
        }`
      }
      to={to}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </NavLink>
  );
}
