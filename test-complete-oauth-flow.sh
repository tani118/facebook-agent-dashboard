#!/bin/bash

# Complete OAuth Flow Test Script
echo "=== Testing Complete Facebook OAuth Flow ==="

API_BASE="https://b1d4-103-108-5-157.ngrok-free.app/api"
FRONTEND_URL="http://localhost:5174"

echo "1. Testing login to get auth token..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d '{"email":"dummy@dummy.com","password":"Dummy123"}')

echo "Login Response:"
echo "$LOGIN_RESPONSE" | jq

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
echo "Auth Token: ${TOKEN:0:20}..."

echo ""
echo "2. Testing authenticated endpoint access..."
PAGES_RESPONSE=$(curl -s -X GET "$API_BASE/facebook-auth/connected-pages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "ngrok-skip-browser-warning: true")

echo "Connected Pages Response:"
echo "$PAGES_RESPONSE" | jq

echo ""
echo "3. Testing OAuth flow - get pages..."
OAUTH_PAGES_RESPONSE=$(curl -s -X POST "$API_BASE/facebook-auth/test-pages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d '{"userToken":"test_facebook_token_123"}')

echo "OAuth Pages Response:"
echo "$OAUTH_PAGES_RESPONSE" | jq

FIRST_PAGE_ID=$(echo "$OAUTH_PAGES_RESPONSE" | jq -r '.data.pages[0].id')
FIRST_PAGE_NAME=$(echo "$OAUTH_PAGES_RESPONSE" | jq -r '.data.pages[0].name')

echo ""
echo "4. Testing OAuth flow - connect page..."
CONNECT_RESPONSE=$(curl -s -X POST "$API_BASE/facebook-auth/test-connect-page" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d "{\"pageId\":\"$FIRST_PAGE_ID\",\"pageName\":\"$FIRST_PAGE_NAME\",\"userToken\":\"test_facebook_token_123\"}")

echo "Connect Page Response:"
echo "$CONNECT_RESPONSE" | jq

echo ""
echo "5. Verifying page connection..."
FINAL_PAGES_RESPONSE=$(curl -s -X GET "$API_BASE/facebook-auth/connected-pages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "ngrok-skip-browser-warning: true")

echo "Final Connected Pages:"
echo "$FINAL_PAGES_RESPONSE" | jq

echo ""
echo "=== OAuth Flow Test Complete ==="
echo "Frontend URL for manual testing: $FRONTEND_URL"
echo "OAuth Success URL: $FRONTEND_URL?facebook_auth=success"
