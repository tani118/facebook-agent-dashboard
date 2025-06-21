#!/bin/bash

echo "=== Testing Login Flow ==="
echo ""

echo "1. Testing login endpoint directly:"
LOGIN_RESPONSE=$(curl -s -X POST "https://b1d4-103-108-5-157.ngrok-free.app/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d '{
    "email": "dummy@dummy.com",
    "password": "Dummy123"
  }')

echo "Login Response:"
echo "$LOGIN_RESPONSE" | jq '.'
echo ""

# Extract token from response
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo "2. Testing auth/me endpoint with token:"
  AUTH_RESPONSE=$(curl -s -X GET "https://b1d4-103-108-5-157.ngrok-free.app/api/auth/me" \
    -H "Authorization: Bearer $TOKEN" \
    -H "ngrok-skip-browser-warning: true")
  
  echo "Auth/me Response:"
  echo "$AUTH_RESPONSE" | jq '.'
  echo ""
  
  echo "3. Token verification:"
  echo "Token (first 50 chars): ${TOKEN:0:50}..."
  echo "Token valid for auth/me: $(echo "$AUTH_RESPONSE" | jq -r '.success')"
else
  echo "❌ Failed to get token from login response"
fi

echo ""
echo "=== Frontend Console Instructions ==="
echo "Open browser developer tools and check console for:"
echo "- 'Login attempt:' messages"
echo "- 'Login response:' messages" 
echo "- 'AuthContext value:' messages"
echo "- Any CORS or network errors"
echo ""
echo "Expected flow:"
echo "1. User enters credentials and clicks login"
echo "2. Console shows 'Login attempt' with email and baseURL"
echo "3. Console shows 'Login response' with success: true"
echo "4. Console shows 'Login successful, token and user set'"
echo "5. Console shows 'AuthContext value' with isAuthenticated: true"
echo "6. User should be redirected away from login page"
