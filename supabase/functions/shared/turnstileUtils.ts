
export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
  const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY');
  if (!secretKey) {
    console.error('TURNSTILE_SECRET_KEY is not set');
    return false;
  }

  try {
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (ip) formData.append('remoteip', ip);

    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const outcome = await result.json();
    
    if (!outcome.success) {
      console.warn('Turnstile verification failed:', outcome['error-codes']);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error verifying Turnstile token:', error);
    return false;
  }
}
