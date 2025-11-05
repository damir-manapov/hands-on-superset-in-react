#!/bin/bash

set -e

echo "🔍 Running checks..."

echo ""
echo "📝 Formatting code..."
pnpm format

echo ""
echo "✅ Checking formatting..."
pnpm format:check

echo ""
echo "🔍 Linting..."
pnpm lint

echo ""
echo "🔍 Type checking..."
pnpm type-check

echo ""
echo "✨ All checks passed!"

