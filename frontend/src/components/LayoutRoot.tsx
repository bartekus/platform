import { Link } from '@tanstack/react-router';

export default function LayoutRoot({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center gap-6 px-4 py-3">
          <Link to="/" className="text-lg font-semibold">
            Platform
          </Link>
          <nav className="ml-auto flex gap-4">
            <Link
              to="/signin"
              className="text-sm text-muted-foreground hover:text-foreground transition-smooth"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
