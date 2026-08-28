/** @deprecated Phone OTP preview access was replaced by Google-only Supabase authentication. */
export async function establishPreviewPhoneSession(_phone: string): Promise<never> {
  throw new Error("Phone OTP sign-in has been retired. Continue with Google instead.");
}
