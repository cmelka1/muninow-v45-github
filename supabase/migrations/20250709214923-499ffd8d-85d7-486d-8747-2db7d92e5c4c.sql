
-- Phase 1: Create backup and validation views
CREATE OR REPLACE VIEW role_migration_backup AS
SELECT 
  p.id,
  p.email,
  p.account_type as profile_account_type,
  p.role as profile_role,
  r.name as current_role,
  ur.entity_id
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id;

-- Phase 2: Clean up duplicate role assignments (keep admin versions)
-- Remove duplicate residentUser assignments where residentAdmin exists
DELETE FROM user_roles 
WHERE user_id IN (
  SELECT DISTINCT ur1.user_id
  FROM user_roles ur1
  JOIN roles r1 ON ur1.role_id = r1.id
  JOIN user_roles ur2 ON ur1.user_id = ur2.user_id
  JOIN roles r2 ON ur2.role_id = r2.id
  WHERE r1.name = 'residentUser' 
    AND r2.name = 'residentAdmin'
    AND ur1.id != ur2.id
)
AND role_id = (SELECT id FROM roles WHERE name = 'residentUser');

-- Remove duplicate businessUser assignments where businessAdmin exists
DELETE FROM user_roles 
WHERE user_id IN (
  SELECT DISTINCT ur1.user_id
  FROM user_roles ur1
  JOIN roles r1 ON ur1.role_id = r1.id
  JOIN user_roles ur2 ON ur1.user_id = ur2.user_id
  JOIN roles r2 ON ur2.role_id = r2.id
  WHERE r1.name = 'businessUser' 
    AND r2.name = 'businessAdmin'
    AND ur1.id != ur2.id
)
AND role_id = (SELECT id FROM roles WHERE name = 'businessUser');

-- Remove duplicate municipalUser assignments where municipalAdmin exists
DELETE FROM user_roles 
WHERE user_id IN (
  SELECT DISTINCT ur1.user_id
  FROM user_roles ur1
  JOIN roles r1 ON ur1.role_id = r1.id
  JOIN user_roles ur2 ON ur1.user_id = ur2.user_id
  JOIN roles r2 ON ur2.role_id = r2.id
  WHERE r1.name = 'municipalUser' 
    AND r2.name = 'municipalAdmin'
    AND ur1.id != ur2.id
)
AND role_id = (SELECT id FROM roles WHERE name = 'municipalUser');

-- Phase 3: Align profiles with user_roles (profiles.account_type + profiles.role → user_roles)
-- Handle users who exist in profiles but not in user_roles
INSERT INTO user_roles (user_id, role_id)
SELECT 
  p.id,
  CASE 
    -- SuperAdmin mapping
    WHEN (p.account_type = 'superAdmin' OR (p.account_type = 'municipal' AND p.role = 'moderator')) 
      THEN (SELECT id FROM roles WHERE name = 'superAdmin')
    -- Municipal mappings
    WHEN p.account_type = 'municipal' AND p.role = 'admin' 
      THEN (SELECT id FROM roles WHERE name = 'municipalAdmin')
    WHEN p.account_type = 'municipal' AND (p.role = 'user' OR p.role IS NULL) 
      THEN (SELECT id FROM roles WHERE name = 'municipalUser')
    -- Resident mappings  
    WHEN p.account_type = 'resident' AND p.role = 'admin' 
      THEN (SELECT id FROM roles WHERE name = 'residentAdmin')
    WHEN p.account_type = 'resident' AND (p.role = 'user' OR p.role IS NULL) 
      THEN (SELECT id FROM roles WHERE name = 'residentUser')
    -- Business mappings
    WHEN p.account_type = 'business' AND p.role = 'admin' 
      THEN (SELECT id FROM roles WHERE name = 'businessAdmin')
    WHEN p.account_type = 'business' AND (p.role = 'user' OR p.role IS NULL) 
      THEN (SELECT id FROM roles WHERE name = 'businessUser')
    -- Default fallback
    ELSE (SELECT id FROM roles WHERE name = 'residentUser')
  END as role_id
FROM profiles p
WHERE p.id NOT IN (SELECT user_id FROM user_roles WHERE user_id IS NOT NULL);

-- Phase 4: Handle profile-to-role inconsistencies
-- Upgrade users who have profile_role='admin' but assigned user roles
UPDATE user_roles 
SET role_id = CASE 
  WHEN p.account_type = 'resident' THEN (SELECT id FROM roles WHERE name = 'residentAdmin')
  WHEN p.account_type = 'business' THEN (SELECT id FROM roles WHERE name = 'businessAdmin')
  WHEN p.account_type = 'municipal' THEN (SELECT id FROM roles WHERE name = 'municipalAdmin')
  ELSE role_id
END
FROM profiles p
JOIN roles r ON user_roles.role_id = r.id
WHERE user_roles.user_id = p.id
  AND p.role = 'admin'
  AND r.name LIKE '%User';

-- Phase 5: Final validation and cleanup
-- Ensure no orphaned user_roles exist
DELETE FROM user_roles 
WHERE user_id NOT IN (SELECT id FROM profiles);

-- Phase 6: Create post-migration validation view
CREATE OR REPLACE VIEW role_migration_results AS
SELECT 
  p.id,
  p.email,
  p.account_type as profile_account_type,
  p.role as profile_role,
  r.name as assigned_role,
  ur.entity_id,
  CASE 
    WHEN p.account_type = 'superAdmin' OR (p.account_type = 'municipal' AND p.role = 'moderator') THEN 'superAdmin'
    WHEN p.account_type = 'municipal' AND p.role = 'admin' THEN 'municipalAdmin'
    WHEN p.account_type = 'municipal' AND (p.role = 'user' OR p.role IS NULL) THEN 'municipalUser'
    WHEN p.account_type = 'resident' AND p.role = 'admin' THEN 'residentAdmin'
    WHEN p.account_type = 'resident' AND (p.role = 'user' OR p.role IS NULL) THEN 'residentUser'
    WHEN p.account_type = 'business' AND p.role = 'admin' THEN 'businessAdmin'
    WHEN p.account_type = 'business' AND (p.role = 'user' OR p.role IS NULL) THEN 'businessUser'
    ELSE 'residentUser'
  END as expected_role,
  CASE 
    WHEN r.name = CASE 
      WHEN p.account_type = 'superAdmin' OR (p.account_type = 'municipal' AND p.role = 'moderator') THEN 'superAdmin'
      WHEN p.account_type = 'municipal' AND p.role = 'admin' THEN 'municipalAdmin'
      WHEN p.account_type = 'municipal' AND (p.role = 'user' OR p.role IS NULL) THEN 'municipalUser'
      WHEN p.account_type = 'resident' AND p.role = 'admin' THEN 'residentAdmin'
      WHEN p.account_type = 'resident' AND (p.role = 'user' OR p.role IS NULL) THEN 'residentUser'
      WHEN p.account_type = 'business' AND p.role = 'admin' THEN 'businessAdmin'
      WHEN p.account_type = 'business' AND (p.role = 'user' OR p.role IS NULL) THEN 'businessUser'
      ELSE 'residentUser'
    END THEN 'ALIGNED'
    ELSE 'MISALIGNED'
  END as alignment_status
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
ORDER BY p.email;

-- Validation queries to run after migration:
-- SELECT * FROM role_migration_results WHERE alignment_status = 'MISALIGNED';
-- SELECT assigned_role, COUNT(*) FROM role_migration_results GROUP BY assigned_role;
-- SELECT COUNT(*) as users_without_roles FROM profiles p WHERE p.id NOT IN (SELECT user_id FROM user_roles);
