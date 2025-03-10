
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthPage from './AuthPage';
import DashboardPage from './DashboardPage';

const Index = () => {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    document.title = 'Content Calendar';
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <DashboardPage /> : <AuthPage />;
};

export default Index;
