import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetCallerUserProfile } from '../hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Wallet, LogOut, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Header() {
  const { identity, clear, login, isLoggingIn } = useInternetIdentity();
  const { data: userProfile } = useGetCallerUserProfile();
  const queryClient = useQueryClient();

  const isAuthenticated = !!identity;

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
    } else {
      try {
        await login();
      } catch (error: any) {
        console.error('Login error:', error);
        if (error.message === 'User is already authenticated') {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 animate-slide-up" role="banner">
      <div className="container flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3 group">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow" aria-hidden="true">
            <Wallet className="h-4 w-4 sm:h-6 sm:w-6 text-primary-foreground transition-transform duration-300 group-hover:rotate-12" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent font-header animate-gradient">
              GreenCart
            </h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground hidden xs:block">Greenlight crypto in your shop!</p>
          </div>
        </div>

        <nav className="flex items-center gap-2 sm:gap-4" role="navigation" aria-label="Main navigation">
          {isAuthenticated && userProfile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full transition-all duration-300 hover:scale-110 hover:shadow-glow"
                  aria-label={`User menu for ${userProfile.name}`}
                >
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold text-xs sm:text-sm">
                      {getInitials(userProfile.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 sm:w-56 animate-scale-in" align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userProfile.name}</p>
                    <p className="text-xs leading-none text-muted-foreground break-all">
                      {identity.getPrincipal().toString().slice(0, 10)}...
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleAuth} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={handleAuth}
              disabled={isLoggingIn}
              size="sm"
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 hover:scale-105 hover:shadow-glow animate-gradient text-xs sm:text-sm px-3 sm:px-4"
              aria-label={isLoggingIn ? 'Connecting wallet' : 'Connect wallet'}
            >
              {isLoggingIn ? (
                <>
                  <div className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" aria-hidden="true" />
                  <span className="hidden xs:inline">Connecting...</span>
                  <span className="xs:hidden">...</span>
                </>
              ) : (
                <>
                  <User className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                  <span className="hidden xs:inline">Connect Wallet</span>
                  <span className="xs:hidden">Connect</span>
                </>
              )}
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
