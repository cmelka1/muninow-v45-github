import { z } from "zod";

// Business type enum matching Finix requirements
export const BusinessTypeEnum = z.enum([
  "INDIVIDUAL_SOLE_PROPRIETORSHIP",
  "LIMITED_LIABILITY_COMPANY", 
  "CORPORATION",
  "TAX_EXEMPT_ORGANIZATION",
  "GOVERNMENT_AGENCY"
]);

// Ownership type enum
export const OwnershipTypeEnum = z.enum([
  "PRIVATE",
  "PUBLIC"
]);

// Refund policy enum
export const RefundPolicyEnum = z.enum([
  "NO_REFUNDS",
  "FULL_REFUNDS",
  "MERCHANDISE_EXCHANGE",
  "PARTIAL_REFUNDS"
]);

// Step 1: Business Information Schema
export const businessInformationSchema = z.object({
  businessType: BusinessTypeEnum,
  businessName: z.string().min(1, "Business name is required"),
  doingBusinessAs: z.string().min(1, "Doing Business As is required"),
  businessTaxId: z.string().min(9, "Valid tax ID is required"),
  businessPhone: z.string().min(10, "Valid phone number is required"),
  businessWebsite: z.string().url("Valid website URL is required"),
  businessDescription: z.string().min(10, "Business description is required"),
  incorporationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  ownershipType: OwnershipTypeEnum,
  businessAddress: z.object({
    line1: z.string().min(1, "Address line 1 is required"),
    line2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    state: z.string().min(2, "State is required"),
    zipCode: z.string().min(5, "ZIP code is required"),
    country: z.string().default("USA")
  })
});

// Step 2: Owner/Principal Information Schema
export const ownerInformationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  workEmail: z.string().email("Valid email is required"),
  personalPhone: z.string().min(10, "Valid phone number is required"),
  personalAddress: z.object({
    line1: z.string().min(1, "Address line 1 is required"),
    line2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    state: z.string().min(2, "State is required"),
    zipCode: z.string().min(5, "ZIP code is required"),
    country: z.string().default("USA")
  }),
  dateOfBirth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional()
    .or(z.literal("")),
  personalTaxId: z.string()
    .min(4, "Last 4 digits of SSN required")
    .max(4, "Only last 4 digits")
    .optional()
    .or(z.literal("")),
  ownershipPercentage: z.number()
    .min(0, "Percentage must be 0 or greater")
    .max(100, "Percentage cannot exceed 100")
    .optional()
});

// Step 3: Processing Information Schema
export const processingInformationSchema = z.object({
  annualAchVolume: z.number().min(0, "Volume must be 0 or greater"),
  annualCardVolume: z.number().min(0, "Volume must be 0 or greater"),
  averageAchAmount: z.number().min(0, "Amount must be 0 or greater"),
  averageCardAmount: z.number().min(0, "Amount must be 0 or greater"),
  cardVolumeDistribution: z.object({
    cardPresent: z.number().min(0).max(100),
    moto: z.number().min(0).max(100),
    ecommerce: z.number().min(0).max(100)
  }).refine((data) => 
    data.cardPresent + data.moto + data.ecommerce === 100,
    { message: "Card volume distribution must total 100%" }
  ),
  businessVolumeDistribution: z.object({
    b2b: z.number().min(0).max(100),
    b2c: z.number().min(0).max(100),
    p2p: z.number().min(0).max(100)
  }).refine((data) => 
    data.b2b + data.b2c + data.p2p === 100,
    { message: "Business volume distribution must total 100%" }
  ),
  mccCode: z.string().min(4, "MCC code is required"),
  statementDescriptor: z.string().min(1, "Statement descriptor is required"),
  maxAchAmount: z.number().min(0, "Amount must be 0 or greater"),
  maxCardAmount: z.number().min(0, "Amount must be 0 or greater"),
  hasAcceptedCardsPreviously: z.boolean(),
  refundPolicy: RefundPolicyEnum,
  merchantAgreementAccepted: z.boolean().refine(val => val === true, {
    message: "Merchant agreement must be accepted"
  }),
  merchantAgreementMetadata: z.object({
    ipAddress: z.string(),
    timestamp: z.string(),
    userAgent: z.string()
  }),
  creditCheckConsent: z.boolean().optional(),
  creditCheckMetadata: z.object({
    ipAddress: z.string(),
    timestamp: z.string(),
    userAgent: z.string()
  }).optional()
});

// Complete form schema
export const finixSellerSchema = z.object({
  businessInformation: businessInformationSchema,
  ownerInformation: ownerInformationSchema,
  processingInformation: processingInformationSchema
});

// Type exports
export type BusinessInformation = z.infer<typeof businessInformationSchema>;
export type OwnerInformation = z.infer<typeof ownerInformationSchema>;
export type ProcessingInformation = z.infer<typeof processingInformationSchema>;
export type FinixSellerFormData = z.infer<typeof finixSellerSchema>;
export type BusinessType = z.infer<typeof BusinessTypeEnum>;