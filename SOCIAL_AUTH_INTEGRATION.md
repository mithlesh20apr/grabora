# Social Media Authentication Integration

## Overview
This document outlines the social media authentication feature integrated into the Grabora e-commerce platform. The implementation supports Google, Twitter, and Facebook OAuth 2.0 authentication on both login and signup pages.

## API Endpoints

### OAuth Web Flow (Redirect-based)
These endpoints are used for web-based OAuth flows where users are redirected to the provider's consent screen:

```
GET /api/v1/auth/google          - Redirects to Google OAuth consent
GET /api/v1/auth/google/callback - Google callback handler
GET /api/v1/auth/twitter         - Redirects to Twitter OAuth consent
GET /api/v1/auth/twitter/callback - Twitter callback handler
GET /api/v1/auth/facebook        - Redirects to Facebook OAuth consent
GET /api/v1/auth/facebook/callback - Facebook callback handler
```

### Token-Based Verification (Mobile/SPA)
For mobile apps or SPAs that handle OAuth directly:

```
POST /api/v1/auth/social/verify - Verify and exchange social tokens
Request: { accessToken, provider }
Response: { success, data: { user, accessToken, refreshToken } }
```

### Linked Accounts Management
For users managing their social connections:

```
GET /api/v1/auth/social/linked    - Get user's linked social accounts (requires auth)
POST /api/v1/auth/social/link     - Link new social account to existing user
DELETE /api/v1/auth/social/unlink/:provider - Unlink a social account
```

## Implementation Status

### ✅ Completed

#### 1. Login Page (`src/app/(auth)/login/page.tsx`)
**Features:**
- Phone/OTP authentication (existing)
- Social login alternative with 3 provider options
- Seamless UX with visual divider "Or continue with"
- Loading states during OAuth flow
- Error handling and user feedback

**Components Added:**
- `socialLoading` state to track active OAuth provider
- `handleSocialLogin(provider)` function that:
  - Redirects to OAuth endpoint
  - Shows loader with provider name
  - Manages disabled state during flow
  - Handles errors gracefully

**UI Elements:**
- Divider line with "Or continue with" text
- 3-column button grid for Google, Facebook, Twitter
- Provider brand colors (Google blue, Facebook #1877F2, Twitter #1DA1F2)
- Loading spinner animation on active button
- Disabled state for all buttons during OAuth flow

#### 2. Register Page (`src/app/(auth)/register/page.tsx`)
**Features:**
- Name/Phone/Email collection with OTP (existing)
- Social signup alternative with same 3 providers
- Integration in details form step

**Components Added:**
- `socialLoading` state to track active OAuth provider
- `handleSocialRegister(provider)` function that:
  - Redirects to OAuth endpoint
  - Shows "Signing up with..." loader message
  - Manages disabled state during flow
  - Identical error handling to login

**UI Elements:**
- Divider line with "Or continue with" text
- 3-column button grid matching login page design
- Positioned after error message, before submit button
- Consistent styling with provider brand colors
- Loading spinner animation on active button

### 🔄 In Progress / Pending

#### 1. OAuth Callback Handling
**Status:** Requires backend implementation
**Details:**
- Need to verify backend handles OAuth callbacks correctly
- Should redirect users to home page after successful authentication
- Should store tokens in AuthContext via login() call

#### 2. Social Account Linking (Post-Login)
**Status:** Backend endpoints exist, frontend UI needed
**Components Needed:**
- Account management page or profile section
- Display linked social accounts
- UI to link new social account to existing profile
- UI to unlink social accounts with confirmation
- Error handling for "already linked to another user"

#### 3. Error Handling for Edge Cases
**Status:** Basic error handling done, edge cases pending
**Cases to Handle:**
- "This {provider} account already linked to another user"
- Insufficient OAuth scopes requested
- Provider API rate limiting
- Token refresh for expired social credentials
- Invalid provider parameter
- User denies OAuth consent

## User Flow

### Login with Social Provider
1. User clicks social provider button on login page
2. `handleSocialLogin()` is triggered
3. Loader shows: "Logging in with Google..."
4. User redirected to `/api/v1/auth/{provider}`
5. Backend redirects to provider OAuth consent screen
6. User consents and grants permissions
7. Provider redirects back to callback URL with auth code
8. Backend exchanges code for tokens and user data
9. Backend returns `{ accessToken, refreshToken, user }`
10. `AuthContext.login()` stores tokens and user
11. User redirected to home page

### Register with Social Provider
1. User clicks social provider button on signup page
2. User enters name first (if not provided by provider)
3. Clicks continue → enters phone number
4. Sees "Or continue with" section
5. Clicks social provider button
6. Same OAuth flow as login
7. User account is created with social provider info
8. User redirected to home page

### Link Social Account (Future Feature)
1. Authenticated user goes to account settings/profile
2. Section shows currently linked social accounts
3. Can click "Link" for unlinked providers
4. Completes OAuth flow but POSTs to `/auth/social/link`
5. Confirms successful linking or shows error
6. Updates display of linked accounts

## Technical Architecture

### State Management
- `AuthContext`: Stores access/refresh tokens and user data
- `useLoader`: Global loader for showing progress
- Local `socialLoading` state: Tracks which provider is loading

### Error Handling
```typescript
try {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
  window.location.href = `${apiBaseUrl}/auth/${provider}`;
} catch (err: any) {
  hideLoader();
  setError(err.message || `Failed to login with ${provider}`);
  setSocialLoading(null);
}
```

### Response Structure
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "string",
      "name": "string",
      "email": "string",
      "avatar": "string",
      "role": "string",
      "authProvider": "phone|google|twitter|facebook",
      "isEmailVerified": "boolean",
      "googleId": "string (optional)",
      "twitterId": "string (optional)",
      "facebookId": "string (optional)"
    },
    "accessToken": "JWT",
    "refreshToken": "JWT"
  }
}
```

## Environment Variables Required

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v2
```

## Browser Requirements
- Modern browser with JavaScript enabled
- Popup support (for OAuth redirects)
- Cookies enabled for session management

## Security Considerations

1. **OAuth State Parameter**: Backend should implement CSRF protection using state parameter
2. **Token Storage**: Tokens stored in memory (AuthContext) - consider adding secure storage for refresh tokens
3. **HTTPS Required**: OAuth flows must use HTTPS in production
4. **Scope Validation**: Verify minimal OAuth scopes are requested
5. **Rate Limiting**: Implement rate limiting on OAuth endpoints
6. **Error Details**: Don't expose sensitive error details to users

## Testing Checklist

- [ ] Google OAuth login works on login page
- [ ] Facebook OAuth login works on login page
- [ ] Twitter OAuth login works on login page
- [ ] Google OAuth signup works on signup page
- [ ] Facebook OAuth signup works on signup page
- [ ] Twitter OAuth signup works on signup page
- [ ] Loader shows during OAuth flow
- [ ] Buttons are disabled during OAuth flow
- [ ] Error messages display correctly on failure
- [ ] User is redirected to home after successful login
- [ ] Tokens are stored in AuthContext
- [ ] User data is available after login
- [ ] Phone/OTP flow still works (existing functionality)
- [ ] Email verification works for social signups
- [ ] Linking accounts (future feature) works

## Future Enhancements

1. **One-Click Linking**: If user logs in with social account that's linked to existing account, auto-link
2. **Provider Icons in Profile**: Show which providers user has linked
3. **Unlink Confirmation**: Add confirmation dialog before unlinking social accounts
4. **Session Recovery**: If user closes browser during OAuth, show option to resume
5. **MFA with Social**: Add option to require additional verification for social logins
6. **Account Merge**: If user has phone account and later signs up with social, merge accounts

## Files Modified

```
src/app/(auth)/login/page.tsx      - Added social login buttons and handlers
src/app/(auth)/register/page.tsx   - Added social signup buttons and handlers
```

## Code Examples

### Using Social Login
```typescript
// From login page
const handleSocialLogin = async (provider: 'google' | 'twitter' | 'facebook') => {
  setSocialLoading(provider);
  showLoader(`Logging in with ${provider.charAt(0).toUpperCase() + provider.slice(1)}...`);
  
  try {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
    window.location.href = `${apiBaseUrl}/auth/${provider}`;
  } catch (err: any) {
    hideLoader();
    setError(err.message || `Failed to login with ${provider}`);
    setSocialLoading(null);
  }
};
```

### Social Button Rendering
```tsx
<button
  type="button"
  onClick={() => handleSocialLogin('google')}
  disabled={socialLoading !== null || loading}
  className="flex items-center justify-center py-3 px-4 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
>
  {socialLoading === 'google' ? (
    <svg className="animate-spin h-5 w-5 text-blue-600">
      {/* Loading spinner */}
    </svg>
  ) : (
    <svg className="w-5 h-5">
      {/* Google icon SVG */}
    </svg>
  )}
</button>
```

## Related Documentation
- [RAZORPAY_SETUP.md](./RAZORPAY_SETUP.md) - Payment integration
- [SUPPORT_API_INTEGRATION.md](./SUPPORT_API_INTEGRATION.md) - Support system API
- [README.md](./README.md) - Project overview
