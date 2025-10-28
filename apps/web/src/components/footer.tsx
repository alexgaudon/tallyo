import { Link } from "@tanstack/react-router";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const buildTime = import.meta.env.VITE_BUILD_TIME || new Date().toISOString();

  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span>© {currentYear} Tallyo</span>
            <Link
              to="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <Link
              to="/privacy"
              className="hover:text-foreground transition-colors"
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
