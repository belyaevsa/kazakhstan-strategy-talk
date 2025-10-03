# Role-Based Access Control - Implementation Summary

## ✅ Roles Implemented

### 1. **Viewer** (Default Role)
- Automatically assigned to all new users
- **Can**:
  - View all pages and paragraphs
  - Add comments
  - Vote on comments (agree/disagree)
  - Reply to comments
- **Cannot**:
  - Edit pages or paragraphs
  - Delete any content
  - Manage users

### 2. **Editor**
- Must be assigned by Admin
- **Can** (all Viewer permissions +):
  - Create, edit, and delete pages
  - Create, edit, and delete paragraphs
  - Change page structure and ordering
  - Hide/show pages (via database management)
- **Cannot**:
  - Delete other users' comments
  - Block users
  - Assign roles

### 3. **Admin**
- Must be assigned by another Admin
- **Can** (all Editor permissions +):
  - Delete any comment (soft delete - stays in DB)
  - Block/unblock users
  - Assign/remove roles to/from users
  - View all users
  - Manage the entire system

## 🔐 Multi-Role Support

- **Users can have multiple roles simultaneously**
- Example: A user can be both Editor and Admin
- Roles are stored in `profile_roles` table
- JWT tokens include all user roles as claims

## 🗄️ Database Changes

### New Tables

**`profile_roles`**
```sql
- id (guid, primary key)
- profile_id (guid, foreign key to profiles)
- role (enum: Viewer, Editor, Admin)
- assigned_at (timestamp)
- Unique index on (profile_id, role)
```

### Modified Tables

**`profiles`**
- Added: `is_blocked` (boolean, default false)

**`comments`**
- Added: `is_deleted` (boolean, default false)
- Added: `deleted_at` (timestamp, nullable)

## 🎯 API Endpoints

### Authentication (Public)
```
POST /api/auth/register  - Create account (auto-assigns Viewer role)
POST /api/auth/login     - Login (blocked users rejected)
GET  /api/auth/me        - Get current user with roles
```

### Pages (Public GET, Editor+ for modifications)
```
GET    /api/pages        - List all pages
GET    /api/pages/{slug} - Get page by slug
POST   /api/pages        - [EditorPolicy] Create page
PUT    /api/pages/{id}   - [EditorPolicy] Update page
DELETE /api/pages/{id}   - [EditorPolicy] Delete page
```

### Paragraphs (Public GET, Editor+ for modifications)
```
GET    /api/paragraphs/page/{pageId} - Get paragraphs for page
POST   /api/paragraphs               - [EditorPolicy] Create paragraph
PUT    /api/paragraphs/{id}          - [EditorPolicy] Update paragraph
DELETE /api/paragraphs/{id}          - [EditorPolicy] Delete paragraph
```

### Comments (Authenticated for POST/PUT/DELETE)
```
GET    /api/comments/page/{pageId}         - Get page comments
GET    /api/comments/paragraph/{paragraphId} - Get paragraph comments
POST   /api/comments                        - [Authorize] Create comment
PUT    /api/comments/{id}                   - [Authorize] Update own comment
DELETE /api/comments/{id}                   - [Authorize] Delete own comment
POST   /api/comments/{id}/vote              - [Authorize] Vote on comment
```

### Admin (Admin only)
```
GET    /api/admin/users                    - [AdminPolicy] List all users
POST   /api/admin/users/{id}/roles         - [AdminPolicy] Assign role
DELETE /api/admin/users/{id}/roles/{role}  - [AdminPolicy] Remove role
POST   /api/admin/users/{id}/block         - [AdminPolicy] Block user
POST   /api/admin/users/{id}/unblock       - [AdminPolicy] Unblock user
DELETE /api/admin/comments/{id}            - [AdminPolicy] Soft delete comment
```

## 🔑 Authorization Policies

Configured in `Program.cs`:

```csharp
EditorPolicy  - Requires Editor OR Admin role
AdminPolicy   - Requires Admin role
ViewerPolicy  - Requires Viewer, Editor, OR Admin role
```

## 📋 JWT Token Structure

Tokens now include role claims:

```json
{
  "nameid": "user-guid",
  "email": "user@example.com",
  "unique_name": "username",
  "role": ["Viewer", "Editor"],  // Multiple roles possible
  "exp": 1234567890
}
```

## 🎨 Frontend Changes

### Auth Service Methods

```typescript
authService.isAuthenticated() // Has valid token
authService.hasRole(role)     // Has specific role
authService.isViewer()        // Has Viewer role
authService.isEditor()        // Has Editor OR Admin
authService.isAdmin()         // Has Admin role
```

### UI Updates

**DocumentPage**:
- Edit button only visible for Editors/Admins
- "Sign in to Edit" shown for non-editors

**Future - Admin Panel**:
- User management interface
- Role assignment
- User blocking
- Comment moderation

## 🚀 Migration Steps

### 1. Update Database

```bash
cd api
dotnet ef migrations add AddRolesAndSoftDelete
dotnet ef database update
```

### 2. Existing Users

All existing users in the database will need the Viewer role assigned manually:

```sql
-- Add Viewer role to all existing users
INSERT INTO profile_roles (id, profile_id, role, assigned_at)
SELECT gen_random_uuid(), id, 0, NOW()
FROM profiles
WHERE id NOT IN (SELECT profile_id FROM profile_roles);
```

### 3. Create First Admin

```sql
-- Assign Admin role to a specific user (replace with actual user ID)
INSERT INTO profile_roles (id, profile_id, role, assigned_at)
VALUES (gen_random_uuid(), 'user-guid-here', 2, NOW());
```

## 🔒 Security Features

### Blocked Users
- Cannot login (rejected at login endpoint)
- Existing tokens become invalid on next API call
- Comments remain visible but user cannot add new ones

### Soft Delete Comments
- Comments marked `is_deleted = true`
- Kept in database for audit trail
- Not returned in API responses
- Comment counts updated appropriately

### Role Validation
- Minimum one role per user (Viewer cannot be removed if only role)
- Role changes require Admin privileges
- Invalid roles rejected

## 📊 Default Behavior

1. **New Registration**: User gets Viewer role automatically
2. **Login**: Blocked users are rejected
3. **Comments**: Deleted comments are hidden but preserved
4. **Authorization**: Fails gracefully with 403 Forbidden

## 🧪 Testing Checklist

- [ ] Register new user → gets Viewer role
- [ ] Viewer can comment and vote
- [ ] Viewer cannot see Edit button
- [ ] Editor can modify pages/paragraphs
- [ ] Admin can block users
- [ ] Admin can delete comments (soft delete)
- [ ] Admin can assign/remove roles
- [ ] Blocked user cannot login
- [ ] Deleted comments are hidden
- [ ] JWT includes all user roles

## 📝 Next Steps

1. **Create Admin Panel UI** (pending)
   - User list with roles
   - Role assignment interface
   - Block/unblock buttons
   - Comment moderation

2. **Add Page Visibility** (future)
   - `is_hidden` flag on pages
   - Editors can hide/show pages
   - Hidden pages not visible to Viewers

3. **Audit Logging** (future)
   - Track who deleted what comment
   - Track role changes
   - Track user blocks

4. **Email Notifications** (future)
   - Notify users when blocked
   - Notify users when roles changed

## ✨ Benefits

- **Granular Control**: Different permissions for different users
- **Security**: Role-based access prevents unauthorized actions
- **Audit Trail**: Soft deletes preserve history
- **Flexibility**: Multiple roles per user
- **Scalability**: Easy to add new roles/permissions

The role system is fully implemented in the backend and ready for frontend admin panel development!
