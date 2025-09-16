# DEPRECATED: process-service-application-payment

This edge function has been deprecated and replaced by the unified payment system.

**Replacement:** Use `process-unified-payment` edge function with `entity_type: 'service_application'`

**Benefits of unified system:**
- Consistent payment processing across all entity types
- Unified fee calculation 
- Better error handling and status transitions
- Single codebase to maintain

**Migration completed:** Service applications now use the unified payment flow with automatic status transitions (approved → issued) after successful payment.

This function should be removed once migration is verified complete.