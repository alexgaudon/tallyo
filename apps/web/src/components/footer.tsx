import { Link } from "@tanstack/react-router";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const buildTime = import.meta.env.VITE_BUILD_TIME || new Date().toISOString();

  return (
    <footer className="border-t border-border/60 bg-background hidden md:block">
      <div className="mx-auto max-w-screen-2xl px-4 py-6 lg:px-8">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span className="font-medium text-foreground">
              © {currentYear} Tallyo
            </span>
            <Link to="/terms" className="hover:text-foreground transition-soft">
              Terms
            </Link>
            <Link
              to="/privacy"
              className="hover:text-foreground transition-soft"
            >
              Privacy Policy
            </Link>
          </div>
          <div className="text-xs text-muted-foreground/60">
            Built on: {new Date(buildTime).toISOString()}
          </div>
        </div>
      </div>
    </footer>
  );
}
