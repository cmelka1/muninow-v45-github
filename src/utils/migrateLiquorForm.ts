import { supabase } from '@/integrations/supabase/client';

/**
 * Utility to migrate the existing liquor form from external URL to Supabase storage
 * This should be run once to fix the broken PDF link
 */
export async function migrateLiquorFormToStorage(): Promise<void> {
  try {
    // First, fetch the PDF file from public folder
    const response = await fetch('/temp-liquor-form.pdf');
    if (!response.ok) {
      throw new Error('Failed to fetch PDF file');
    }
    
    const pdfBlob = await response.blob();
    const pdfFile = new File([pdfBlob], 'liquor-license-application.pdf', { type: 'application/pdf' });
    
    // Upload to Supabase Storage
    const customerId = 'd20b3740-65ff-4408-b8ec-8cba38a8a687'; // Hinsdale customer ID
    const fileName = `${customerId}/liquor-license-application.pdf`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('municipal-service-forms')
      .upload(fileName, pdfFile);

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('municipal-service-forms')
      .getPublicUrl(fileName);

    // Update the service tile with the new URL
    const { error: updateError } = await supabase
      .from('municipal_service_tiles')
      .update({ pdf_form_url: publicUrl })
      .eq('id', 'f6ea2570-7e50-471d-93c0-487fe767c3e3');

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    console.log('Successfully migrated liquor form to storage:', publicUrl);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}