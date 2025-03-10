
import { useState } from 'react';
import { ContentCalendar } from '@/components/content/ContentCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

const DashboardPage = () => {
  const { user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg">C</div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-violet-500 to-purple-600 bg-clip-text text-transparent">Content Calendar</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            
            <div className="flex items-center gap-2 text-sm py-1 px-3 rounded-full bg-accent">
              <User className="h-4 w-4 text-purple-500" />
              <span className="font-medium">{user?.email}</span>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="rounded-full border-purple-200 hover:bg-purple-50 hover:text-purple-700 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2 text-purple-500" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      <ContentCalendar />
    </div>
  );
};

export default DashboardPage;
