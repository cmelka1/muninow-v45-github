# DEPRECATED: process-service-application-apple-pay

This edge function has been deprecated and replaced by the unified payment system.

**Replacement:** Use `process-unified-payment` edge function with Apple Pay tokens and `entity_type: 'service_application'`

**Benefits of unified system:**
- Consistent Apple Pay processing across all entity types
- Unified fee calculation and error handling
- Better status transitions and notifications
- Single codebase to maintain

**Migration completed:** Service applications now use the unified payment flow for Apple Pay.

This function should be removed once migration is verified complete.