import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { migrateLiquorFormToStorage } from '@/utils/migrateLiquorForm';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export function MigratePDFButton() {
  const [isMigrating, setIsMigrating] = useState(false);
  const { profile } = useAuth();
  
  // Only show for super admins or municipal users
  if (!profile || (profile.account_type !== 'municipal' && !profile.email?.includes('cmelka@muninow.com'))) {
    return null;
  }

  const handleMigration = async () => {
    try {
      setIsMigrating(true);
      await migrateLiquorFormToStorage();
      toast({
        title: 'Success',
        description: 'PDF form has been migrated to secure storage',
      });
    } catch (error) {
      toast({
        title: 'Error', 
        description: 'Failed to migrate PDF form',
        variant: 'destructive',
      });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <Button
      onClick={handleMigration}
      disabled={isMigrating}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      <Upload className="h-4 w-4" />
      {isMigrating ? 'Migrating...' : 'Fix PDF Link'}
    </Button>
  );
}