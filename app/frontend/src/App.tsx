import { lazy, Suspense, useEffect, useState } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile, useSaveCallerUserProfile } from './hooks/useQueries';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import Header from './components/Header';
import Footer from './components/Footer';
import ProfileSetupModal from './components/ProfileSetupModal';
import LoginPrompt from './components/LoginPrompt';

// Lazy load Dashboard for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));

// Logging configuration - set to false for production
// LOGGING: Main app component logs authentication flow and profile setup
const ENABLE_LOGGING = true;

function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) {
  if (!ENABLE_LOGGING) return;
  const timestamp = new Date().toISOString();
  const prefix = `[${level}] [${timestamp}] [APP]`;
  console[level.toLowerCase() as 'info' | 'warn' | 'error'](prefix, message, data || '');
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();
  const { mutate: saveProfile } = useSaveCallerUserProfile();
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  const isAuthenticated = !!identity;

  useEffect(() => {
    log('INFO', 'Authentication state changed', { 
      isAuthenticated, 
      profileLoading, 
      isFetched, 
      hasProfile: !!userProfile 
    });
    
    if (isAuthenticated && !profileLoading && isFetched && userProfile === null) {
      log('INFO', 'Showing profile setup modal for new user');
      setShowProfileSetup(true);
    } else {
      setShowProfileSetup(false);
    }
  }, [isAuthenticated, profileLoading, isFetched, userProfile]);

  const handleProfileSave = (name: string) => {
    log('INFO', 'Saving user profile', { nameLength: name.length });
    
    // Sanitize input
    const sanitizedName = name.trim().replace(/[<>]/g, '');
    if (!sanitizedName) {
      log('WARN', 'Profile save attempted with empty name');
      return;
    }

    saveProfile(
      { name: sanitizedName },
      {
        onSuccess: () => {
          log('INFO', 'Profile saved successfully, closing setup modal');
          setShowProfileSetup(false);
        },
        onError: (error) => {
          log('ERROR', 'Profile save failed', { error: error.message });
        },
      }
    );
  };

  if (isInitializing) {
    log('INFO', 'App initializing, showing loading fallback');
    return (
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <LoadingFallback />
      </ThemeProvider>
    );
  }

  log('INFO', 'App rendering main content', { isAuthenticated });

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1" role="main">
          {!isAuthenticated ? (
            <LoginPrompt />
          ) : (
            <Suspense fallback={<LoadingFallback />}>
              <Dashboard />
              <ProfileSetupModal
                open={showProfileSetup}
                onSave={handleProfileSave}
              />
            </Suspense>
          )}
        </main>
        <Footer />
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
