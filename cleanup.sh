#!/bin/bash

echo "🧹 Cleaning up unnecessary files..."

# Remove system files
rm -f .DS_Store
rm -f logistics-frontend/.DS_Store  
rm -f logistics-backend/.DS_Store

# Remove temporary deployment scripts
rm -f quick-deploy.sh
rm -f create-service.sh
rm -f get-urls.sh
rm -f fix-iam.sh
rm -f deploy-685057748064.sh

# Remove demo/test files
rm -f index.html
rm -f demo.html
rm -f DEPLOY-NOW.md

# Remove unused backend files
rm -f logistics-backend/fixed-packages.json
rm -f logistics-backend/redis-server.js
rm -f logistics-backend/.env

# Remove duplicate READMEs
rm -f logistics-frontend/README.md
rm -f logistics-backend/README.md
rm -f logistics-frontend/.npmrc

echo "✅ Cleanup complete!"
echo "📁 Essential files kept:"
echo "  - README.md (main)"
echo "  - README-DEPLOYMENT.md"
echo "  - deploy.sh"
echo "  - docker-compose.yml"
echo "  - Dockerfiles"
echo "  - Source code"
