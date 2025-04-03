import { Link } from "wouter";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="mt-12 pt-8 border-t border-border">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <div className="mb-4 md:mb-0">
          <p className="text-sm text-muted-foreground">© {currentYear} FinSavvy. All rights reserved.</p>
        </div>
        <div className="flex space-x-6">
          <Link href="/privacy">
            <a className="text-sm text-muted-foreground hover:text-primary">Privacy Policy</a>
          </Link>
          <Link href="/terms">
            <a className="text-sm text-muted-foreground hover:text-primary">Terms of Service</a>
          </Link>
          <Link href="/support">
            <a className="text-sm text-muted-foreground hover:text-primary">Contact Support</a>
          </Link>
        </div>
      </div>
    </div>
  );
}
