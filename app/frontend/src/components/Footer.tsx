import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" role="contentinfo">
      <div className="container flex h-14 sm:h-16 items-center justify-center px-4">
        <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 sm:gap-2 text-center">
          <span className="hidden xs:inline">© 2025. Built with</span>
          <span className="xs:hidden">Built with</span>
          <Heart className="h-3 w-3 sm:h-4 sm:w-4 fill-red-500 text-red-500" aria-hidden="true" />
          <span className="hidden xs:inline">using</span>
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </footer>
  );
}
