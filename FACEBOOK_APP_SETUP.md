# Facebook App Configuration Guide

## Current Setup Status ✅

Your Facebook Helpdesk Dashboard is ready for Facebook App configuration! Here's what's already set up:

- ✅ Backend running on: `https://b1d4-103-108-5-157.ngrok-free.app`
- ✅ Frontend running on: `http://localhost:5173`
- ✅ Webhook verification endpoint: `https://b1d4-103-108-5-157.ngrok-free.app/api/webhook`
- ✅ OAuth callback endpoint: `https://b1d4-103-108-5-157.ngrok-free.app/api/facebook-auth/callback`
- ✅ Webhook verify token: `d67acd0ed41140046f76d08300db352d78218bb692e2f8f79af228e54eb99395`

## Facebook Developers Console Configuration

### Step 1: Create/Access Your Facebook App

1. Go to [Facebook Developers Console](https://developers.facebook.com/)
2. Login with your Facebook account
3. Navigate to "My Apps" and select your app (ID: `989959006348324`)

### Step 2: Configure Webhooks

1. In your Facebook App dashboard, go to **Products** → **Webhooks**
2. Click **"Add Webhook"** if not already added
3. Configure the webhook with these settings:

   **Callback URL:** `https://b1d4-103-108-5-157.ngrok-free.app/api/webhook`
   
   **Verify Token:** `d67acd0ed41140046f76d08300db352d78218bb692e2f8f79af228e54eb99395`
   
   **Subscription Fields:** Select these checkboxes:
   - ✅ `messages`
   - ✅ `messaging_postbacks`
   - ✅ `messaging_optins`
   - ✅ `messaging_deliveries`
   - ✅ `messaging_reads`
   - ✅ `feed`
   - ✅ `post_comments`

4. Click **"Verify and Save"**

### Step 3: Configure Messenger Product

1. Go to **Products** → **Messenger**
2. In **Settings** → **Webhooks**, subscribe your webhook to your Facebook pages
3. For each page you want to monitor:
   - Click **"Subscribe"** next to the page name
   - Select subscription fields: `messages`, `messaging_postbacks`, `messaging_optins`

### Step 4: Configure Facebook Login Product

1. Go to **Products** → **Facebook Login** (add if not present)
2. In **Settings** → **Valid OAuth Redirect URIs**, add:
   ```
   https://b1d4-103-108-5-157.ngrok-free.app/api/facebook-auth/callback
   ```

### Step 5: App Settings

1. Go to **Settings** → **Basic**
2. Verify these settings:
   - **App ID:** `989959006348324`
   - **App Secret:** `31e9756e3efb40d43b7d1ef98cedf675`
   - **App Domains:** Add `b1d4-103-108-5-157.ngrok-free.app`

### Step 6: Page Permissions

1. Go to **Products** → **Messenger** → **Settings**
2. Generate page access tokens for each page you want to connect
3. Grant these permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_metadata`
   - `pages_messaging`
   - `business_management`
   - `pages_manage_engagement`

## Testing the Integration

### Test 1: Webhook Verification
```bash
curl -X GET "https://b1d4-103-108-5-157.ngrok-free.app/api/webhook?hub.mode=subscribe&hub.challenge=test123&hub.verify_token=d67acd0ed41140046f76d08300db352d78218bb692e2f8f79af228e54eb99395"
```
**Expected Response:** `test123`

### Test 2: OAuth Flow
1. Open your frontend: `http://localhost:5173`
2. Login/Signup with test credentials
3. Click "Connect to Facebook" 
4. Complete Facebook OAuth flow
5. Verify you're redirected back with success message

### Test 3: Webhook Reception
After configuration, test by:
1. Sending a message to your Facebook page
2. Commenting on a Facebook page post
3. Check backend logs for webhook events

## Troubleshooting

### Common Issues:

1. **Webhook Verification Failed**
   - Ensure the verify token matches exactly
   - Check that ngrok tunnel is active
   - Verify the webhook URL is accessible

2. **OAuth Redirect Error**
   - Verify the redirect URI in Facebook app settings
   - Check that the app domain is configured
   - Ensure frontend URL handles OAuth parameters

3. **Permission Denied**
   - Verify app has required permissions
   - Check that pages are subscribed to webhook
   - Ensure app is approved for production (if needed)

4. **CORS Issues**
   - Verify frontend URL is in CORS configuration
   - Check that axios is using correct base URL

## Next Steps

After configuration:
1. Test the complete OAuth flow
2. Test webhook message reception
3. Test comment monitoring
4. Deploy to production with permanent HTTPS URLs

## Important Notes

⚠️ **Security**: The ngrok URL is temporary and will change when restarted. For production, deploy to a cloud provider with permanent HTTPS URLs.

⚠️ **App Review**: For production use, Facebook may require app review depending on permissions needed.

⚠️ **Rate Limits**: Be aware of Facebook API rate limits in production.

## Support

If you encounter issues:
1. Check Facebook App dashboard for error messages
2. Monitor backend console logs
3. Use Facebook's Graph API Explorer for testing
4. Review Facebook's webhook documentation
