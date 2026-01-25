import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SuperAdminInviteMunicipalDialogProps {
  customerId: string;
  customerName: string;
  onInviteSent?: () => void;
}

export const SuperAdminInviteMunicipalDialog: React.FC<SuperAdminInviteMunicipalDialogProps> = ({
  customerId,
  customerName,
  onInviteSent
}) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('admin');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      // Create invitation via RPC - returns both id and token
      const { data: result, error: createError } = await (supabase.rpc as Function)(
        'create_superadmin_municipal_invitation',
        {
          p_customer_id: customerId,
          p_invitation_email: email,
          p_role: role
        }
      );

      if (createError) throw createError;
      
      // RPC now returns a table with invitation_id and invitation_token
      const invitationData = result?.[0] || result;
      const invitationId = invitationData?.invitation_id;
      const invitationToken = invitationData?.invitation_token;

      if (!invitationId || !invitationToken) {
        throw new Error('Failed to create invitation');
      }

      // Send invitation email via Edge Function
      const { error: emailError } = await supabase.functions.invoke('send-organization-invitation', {
        body: {
          invitation_id: invitationId,
          invitation_email: email,
          invitation_token: invitationToken,
          role: role,
          organization_type: 'municipal',
          customer_id: customerId,
          customer_name: customerName
        }
      });

      if (emailError) {
        console.warn('Email sending failed, but invitation was created:', emailError);
      }

      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${email} as Municipal ${role === 'admin' ? 'Admin' : 'User'}`,
      });

      setEmail('');
      setRole('admin');
      setOpen(false);
      onInviteSent?.();
    } catch (error: unknown) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Invite Municipal User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Municipal User</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            for {customerName}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@municipality.gov"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'user')}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin - Full access to municipal dashboard</SelectItem>
                <SelectItem value="user">User - Limited access, read-only for some features</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Invitation'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

