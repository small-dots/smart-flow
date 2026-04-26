#!/bin/bash
# Use Node 22
export PATH="/Users/anzhongqi/.nvm/versions/node/v22.15.0/bin:$PATH"

echo "🚀 Starting SMART Flow..."
echo "   Backend: http://localhost:3001"
echo "   Frontend: http://localhost:5173"
echo ""

npm run dev
