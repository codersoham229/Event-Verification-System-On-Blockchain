import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';
import { useLocation } from 'wouter';

export function DashboardLink() {
  const [, setLocation] = useLocation();

  return (
    <Button
      onClick={() => setLocation('/dashboard')}
      variant="outline"
      className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-0 hover:from-indigo-600 hover:to-purple-600"
    >
      <BarChart3 className="mr-2 h-4 w-4" />
      View Dashboard
    </Button>
  );
}
