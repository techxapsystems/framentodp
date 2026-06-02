# Safe Development Workflow

This guide ensures we can continue development without breaking production.

---

## Current State

- **Production**: Checkpoint `be9a6a8` - Stable and working ✅
- **Development**: Ready for new features

---

## Workflow: Development → Staging → Production

### Step 1: Start Development (Create Feature Branch)
```bash
# Make sure we're on the stable production commit
git checkout be9a6a8

# Create a new feature branch
git checkout -b feature/your-feature-name

# Start developing
```

### Step 2: Develop & Test Locally
```bash
# Make your changes
# Test in dev server: pnpm dev

# Commit regularly with clear messages
git commit -m "feat: description of what you did"

# Before committing, ALWAYS:
# 1. Run: pnpm build
# 2. Test login flow in dev server
# 3. Check for console errors
# 4. Run: pnpm test (if applicable)
```

### Step 3: Create Staging Checkpoint
```bash
# When feature is ready for testing:
# 1. Make sure build passes: pnpm build
# 2. Test all related flows in dev server
# 3. Save checkpoint with clear description
# webdev_save_checkpoint (via Manus tools)
```

### Step 4: Test in Staging Environment
```bash
# The checkpoint creates a new version
# Test this version thoroughly:
# - Login flow
# - All affected pages
# - Edge cases
# - Console for errors
```

### Step 5: Merge to Production
```bash
# Only after staging tests pass:
# 1. Create a final checkpoint
# 2. Click "Publish" in Manus UI
# 3. Test production immediately after
```

---

## Pre-Commit Checklist

Before running `git commit`, verify:

- [ ] **Build**: `pnpm build` passes without errors
- [ ] **Types**: No TypeScript errors
- [ ] **Tests**: `pnpm test` passes (if applicable)
- [ ] **Dev Server**: No console errors
- [ ] **Login Flow**: Can login and see dashboard
- [ ] **Related Pages**: All affected pages load without errors
- [ ] **Data Rendering**: No objects/arrays rendered as JSX
- [ ] **Defensive Guards**: All data validated before rendering

---

## Pre-Deployment Checklist

Before deploying to production:

- [ ] **Feature Complete**: All features working as expected
- [ ] **Staging Tested**: Tested in staging environment
- [ ] **No Breaking Changes**: Doesn't break existing functionality
- [ ] **Data Validation**: All API responses validated
- [ ] **Error Handling**: All error cases handled gracefully
- [ ] **Performance**: No significant performance degradation
- [ ] **Accessibility**: No accessibility regressions
- [ ] **Documentation**: Updated INCIDENT_POSTMORTEM.md if relevant

---

## Critical Flows to Test

Always test these flows before deploying:

### 1. Authentication Flow
```
1. Go to login page
2. Enter credentials
3. Click login
4. Verify dashboard loads without errors
5. Check all menu items are visible
6. Check user info is displayed correctly
```

### 2. Data Rendering Flow
```
1. Navigate to Acompanhamento
2. Verify operations dropdown loads
3. Select an operation
4. Verify charts and tables render
5. Check no console errors
```

### 3. Form Submission Flow
```
1. Go to Cadastro de Advertências
2. Fill form with test data
3. Submit form
4. Verify success message
5. Verify data appears in list
```

---

## Common Pitfalls to Avoid

### ❌ Don't Do This

```typescript
// Don't render objects directly
{operation}  // ❌ Error #185

// Don't assume data shape
{op.nome}  // ❌ What if op is a string?

// Don't skip validation
const data = JSON.parse(localStorage.getItem('user'));  // ❌ No error handling

// Don't commit without testing
git commit -m "quick fix"  // ❌ Didn't test
```

### ✅ Do This Instead

```typescript
// Convert to string before rendering
{String(operation || '')}  // ✅

// Validate data shape first
const opName = typeof op === 'string' ? op : op?.nome;  // ✅

// Always validate
const user = JSON.parse(localStorage.getItem('user') || '{}');  // ✅

// Test before committing
// 1. pnpm build
// 2. Test in dev server
// 3. Check console
// 4. git commit
```

---

## Rollback Procedure (If Needed)

If something breaks in production:

```bash
# 1. Identify the last stable checkpoint
# 2. Use webdev_rollback_checkpoint with that version
# 3. Test immediately in production
# 4. Investigate what went wrong
# 5. Fix the issue properly
# 6. Re-test before deploying again
```

---

## Git Workflow Summary

```
main (production - be9a6a8)
  ↓
feature/your-feature (development)
  ↓
[Make changes, test locally]
  ↓
[Create staging checkpoint]
  ↓
[Test in staging]
  ↓
[Merge back to main]
  ↓
[Create production checkpoint]
  ↓
[Publish to production]
```

---

## Environment Variables

All environment variables are automatically injected:
- `DATABASE_URL`
- `JWT_SECRET`
- `VITE_APP_ID`
- `OAUTH_SERVER_URL`
- And others...

Never hardcode these. Use `process.env.VARIABLE_NAME` in code.

---

## Testing Strategy

### Unit Tests
```bash
pnpm test
```

### Dev Server Testing
```bash
pnpm dev
# Then test manually in browser
```

### Build Testing
```bash
pnpm build
# Verify no errors
```

### Production Testing
- Test login flow
- Test all main pages
- Check console for errors
- Verify data renders correctly

---

## Communication

When deploying:
1. Create a checkpoint with a clear description
2. Note what was changed
3. Note what was tested
4. Note any known issues

Example checkpoint description:
```
Added bulk import feature for warnings:
- Excel parser with automatic infraction detection
- PDF generation for imported warnings
- Audit logging for all imports
- UI with tabs for manual/bulk import

Tested:
- Login flow ✅
- Excel file upload ✅
- PDF generation ✅
- All pages load without errors ✅

Known issues:
- None
```

---

## Questions?

Refer to `INCIDENT_POSTMORTEM.md` for lessons learned and best practices.
