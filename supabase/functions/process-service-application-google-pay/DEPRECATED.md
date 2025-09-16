# DEPRECATED: process-service-application-google-pay

This edge function has been deprecated and replaced by the unified payment system.

**Replacement:** Use `process-unified-google-pay` edge function with `entity_type: 'service_application'`

**Benefits of unified system:**
- Consistent Google Pay processing across all entity types
- Unified fee calculation and error handling
- Better status transitions and notifications
- Single codebase to maintain

**Migration completed:** Service applications now use the unified Google Pay flow.

This function should be removed once migration is verified complete.