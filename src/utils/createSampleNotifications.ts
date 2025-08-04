import { supabase } from '@/integrations/supabase/client';

export const createSampleNotifications = async (userId: string) => {
  const sampleNotifications = [
    {
      user_id: userId,
      notification_type: 'payment',
      title: 'Payment Successful',
      message: 'Your payment of $125.00 for water bill has been processed successfully.',
      action_url: '/payment-history',
      is_read: false
    },
    {
      user_id: userId,
      notification_type: 'bill',
      title: 'New Bill Available',
      message: 'Your January water and sewer bill is now available for payment.',
      action_url: '/dashboard',
      is_read: false
    },
    {
      user_id: userId,
      notification_type: 'permit',
      title: 'Permit Application Update',
      message: 'Your building permit application #PM240001 is now under review.',
      action_url: '/permits',
      is_read: false
    },
    {
      user_id: userId,
      notification_type: 'system',
      title: 'Profile Updated',
      message: 'Your profile information has been successfully updated.',
      action_url: '/profile',
      is_read: true
    },
    {
      user_id: userId,
      notification_type: 'permit',
      title: 'Permit Approved',
      message: 'Congratulations! Your building permit application #PM240002 has been approved.',
      action_url: '/permits',
      is_read: true
    }
  ];

  try {
    const { error } = await supabase
      .from('user_notifications')
      .insert(sampleNotifications);

    if (error) throw error;
    console.log('Sample notifications created successfully');
  } catch (error) {
    console.error('Error creating sample notifications:', error);
  }
};