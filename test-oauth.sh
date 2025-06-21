#!/bin/bash

echo "=== Testing Facebook OAuth Flow ==="
echo ""

echo "1. Testing OAuth Initiation Endpoint:"
RESPONSE=$(curl -s "https://b1d4-103-108-5-157.ngrok-free.app/api/facebook-auth/" -H "ngrok-skip-browser-warning: true" -I)
echo "$RESPONSE"
echo ""

echo "2. Extracting OAuth URL from Location header:"
OAUTH_URL=$(echo "$RESPONSE" | grep -i "location:" | cut -d' ' -f2- | tr -d '\r')
echo "OAuth URL: $OAUTH_URL"
echo ""

echo "3. OAuth URL Parameters:"
echo "$OAUTH_URL" | sed 's/[&?]/\n/g' | grep -E "(client_id|redirect_uri|scope|response_type|state)" | sed 's/%3A/:/g' | sed 's/%2F/\//g' | sed 's/%253A/:/g' | sed 's/%252F/\//g'
echo ""

echo "4. Testing Backend Health:"
curl -s "https://b1d4-103-108-5-157.ngrok-free.app/api/health" -H "ngrok-skip-browser-warning: true"
echo ""
echo ""

echo "5. Frontend Test URL:"
echo "Visit: http://localhost:5173"
echo ""

echo "=== Manual Test Instructions ==="
echo "1. Go to http://localhost:5173"
echo "2. Login/Signup to dashboard"
echo "3. Click 'Connect to Facebook'"
echo "4. Complete Facebook OAuth flow"
echo "5. Check backend terminal for detailed logs"
echo ""

echo "=== Facebook App Configuration Check ==="
echo "✓ App ID: 989959006348324"
echo "✓ Webhook URL: https://b1d4-103-108-5-157.ngrok-free.app/api/webhook"
echo "✓ OAuth Redirect: https://b1d4-103-108-5-157.ngrok-free.app/api/facebook-auth/callback"
echo "✓ App should be in Development Mode"
echo "✓ Your Facebook account should be added as Developer/Tester"
