import { z } from 'zod';

export const bankAccountSchema = z.object({
  nameOnAccount: z.string().min(1, 'Name on account is required'),
  accountNickname: z.string().optional(),
  routingNumber: z.string()
    .min(9, 'Routing number must be 9 digits')
    .max(9, 'Routing number must be 9 digits')
    .regex(/^\d{9}$/, 'Routing number must contain only numbers'),
  accountNumber: z.string()
    .min(1, 'Account number is required')
    .regex(/^\d+$/, 'Account number must contain only numbers'),
  accountNumberConfirmation: z.string().min(1, 'Please confirm your account number'),
}).refine((data) => data.accountNumber === data.accountNumberConfirmation, {
  message: "Account numbers don't match",
  path: ["accountNumberConfirmation"],
});

export type BankAccountFormData = z.infer<typeof bankAccountSchema>;

export const merchantAccountSchema = z.object({
  bankAccount: bankAccountSchema,
});

export type MerchantAccountFormData = z.infer<typeof merchantAccountSchema>;