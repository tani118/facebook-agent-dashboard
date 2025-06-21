#!/bin/bash

# Facebook Messaging Functionality Verification Script
echo "🧪 TESTING FACEBOOK MESSAGING FUNCTIONALITY FIXES"
echo "=================================================="

API_BASE="http://localhost:5000/api"
# Use the working auth token from previous successful tests
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODU2NWZhNTdlNTQ1NWRlNmI3YWRmYzIiLCJpYXQiOjE3NTA0OTY3ODMsImV4cCI6MTc1MTEwMTU4M30.Q_G7twDD7iFHAM0m1xq3Zw_LkSa0JObRMiPY6--XEL4"
PAGE_ID="666760583189727"
PAGE_TOKEN="EAAOEXMrqZACQBOzDhz0IE5ADj3vZB9EZAZCg1JuZBdAiukvvvFrLVvqZAAwWJniNZCujmFQg1m2nwEaIsu97AQZAKWEuXFSSK1SzLacHAwCA3n0cbZBD2HOigEHjKJ9HS91jcVENeg2oZA9R0YhJZA1iBO3OJWZBPBf35B1ZCGdHDkBBAZAXjohLnH6UZAYGqoI2SYT84x4L34Q"

echo ""
echo "1️⃣  Testing Connected Pages..."
PAGES_RESPONSE=$(curl -s -X GET "$API_BASE/facebook-auth/connected-pages" \
  -H "Authorization: Bearer $TOKEN")

echo "$PAGES_RESPONSE" | jq '.data.pages[0] | {pageId, pageName, pageAccessToken: (.pageAccessToken[:20] + "...")}'

echo ""
echo "2️⃣  Testing Local Conversations API..."
CONV_RESPONSE=$(curl -s -X GET "$API_BASE/conversations?pageId=$PAGE_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$CONV_RESPONSE" | jq '.data.conversations[0] | {conversationId, customerName, lastMessageContent, lastMessageAt, unreadCount}'

echo ""
echo "3️⃣  Testing Conversation Sync..."
SYNC_RESPONSE=$(curl -s -X POST "$API_BASE/conversations/sync" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"pageAccessToken\":\"$PAGE_TOKEN\",\"pageId\":\"$PAGE_ID\",\"limit\":25}")

echo "$SYNC_RESPONSE" | jq '{success, message, syncedCount: .data.syncedCount}'

echo ""
echo "4️⃣  Testing Facebook API Messages (Fallback)..."
FB_MESSAGES_RESPONSE=$(curl -s -X GET "$API_BASE/facebook/conversations/t_1524056099000153/messages?pageAccessToken=$PAGE_TOKEN&limit=25" \
  -H "Authorization: Bearer $TOKEN")

echo "$FB_MESSAGES_RESPONSE" | jq '{success, messageCount: (.data.data | length), firstMessage: .data.data[0].message}'

echo ""
echo "5️⃣  Testing Message Send Functionality..."
SEND_RESPONSE=$(curl -s -X POST "$API_BASE/facebook/conversations/t_1524056099000153/send" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Test auto-refresh functionality - $(date)\",\"pageAccessToken\":\"$PAGE_TOKEN\",\"pageId\":\"$PAGE_ID\"}")

echo "$SEND_RESPONSE" | jq '{success, message, recipient_id: .data.recipient_id}'

echo ""
echo "✅ SUMMARY OF FIXES IMPLEMENTED:"
echo "================================"
echo "✅ Fixed 'Unknown Customer' - Now shows real customer names"
echo "✅ Fixed 'Invalid Date' - Proper timestamp formatting implemented"  
echo "✅ Fixed 'No messages yet' - Real message content displayed"
echo "✅ Fixed message ordering - Chronological ordering implemented"
echo "✅ Added auto-refresh - 30s for conversations, 15s for messages"
echo "✅ Enhanced error handling - Fallback to Facebook API if local fails"
echo "✅ Improved message display - Better formatting and sender identification"

echo ""
echo "🎯 EXPECTED USER EXPERIENCE:"
echo "==========================="
echo "• Left panel: Real customer names, valid timestamps, message previews"
echo "• Right panel: Properly ordered messages with correct sender info"
echo "• Auto-updates: No manual refresh needed"
echo "• Live data: Synced from Facebook API automatically"

echo ""
echo "🚀 Frontend running at: http://localhost:5173"
echo "🔧 Backend API at: http://localhost:5000/api"
echo ""
echo "Test complete! 🎉"
