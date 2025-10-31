#!/bin/bash

# Verification script for K8s Practice Exam System

set -e

echo "🔍 Verifying K8s Practice Exam System Setup"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -d "k3s" ] || [ ! -d "angualr-k8s.milldrew.com" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "✅ Directory structure looks good"
echo ""

# Check Docker
echo "🐳 Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi
echo "✅ Docker found: $(docker --version)"
echo ""

# Check Node.js
echo "📦 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    exit 1
fi
echo "✅ Node.js found: $(node --version)"
echo ""

# Check npm
echo "📦 Checking npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed or not in PATH"
    exit 1
fi
echo "✅ npm found: $(npm --version)"
echo ""

# Check k3s control-plane-server files
echo "🔧 Checking K3s control-plane server files..."
if [ ! -f "k3s/control-plane-server/package.json" ]; then
    echo "❌ k3s/control-plane-server/package.json not found"
    exit 1
fi
if [ ! -f "k3s/control-plane-server/server.js" ]; then
    echo "❌ k3s/control-plane-server/server.js not found"
    exit 1
fi
echo "✅ K3s control-plane server files exist"
echo ""

# Check Dockerfile
echo "🐳 Checking Dockerfile..."
if [ ! -f "k3s/Dockerfile.k3s-server" ]; then
    echo "❌ k3s/Dockerfile.k3s-server not found"
    exit 1
fi
echo "✅ Dockerfile exists"
echo ""

# Check docker-compose.yml
echo "🐳 Checking docker-compose.yml..."
if [ ! -f "k3s/docker-compose.yml" ]; then
    echo "❌ k3s/docker-compose.yml not found"
    exit 1
fi
echo "✅ docker-compose.yml exists"
echo ""

# Check Angular files
echo "🅰️  Checking Angular application files..."
if [ ! -f "angualr-k8s.milldrew.com/package.json" ]; then
    echo "❌ angualr-k8s.milldrew.com/package.json not found"
    exit 1
fi
if [ ! -f "angualr-k8s.milldrew.com/src/server.ts" ]; then
    echo "❌ angualr-k8s.milldrew.com/src/server.ts not found"
    exit 1
fi
echo "✅ Angular application files exist"
echo ""

# Check Angular services
echo "🔧 Checking Angular services..."
SERVICES=(
    "angualr-k8s.milldrew.com/src/app/services/websocket.service.ts"
    "angualr-k8s.milldrew.com/src/app/services/cluster.service.ts"
    "angualr-k8s.milldrew.com/src/app/services/exam-data.service.ts"
    "angualr-k8s.milldrew.com/src/app/services/question-lifecycle.service.ts"
)

for service in "${SERVICES[@]}"; do
    if [ ! -f "$service" ]; then
        echo "❌ $service not found"
        exit 1
    fi
done
echo "✅ All Angular services exist"
echo ""

# Check Angular components
echo "🔧 Checking Angular components..."
COMPONENTS=(
    "angualr-k8s.milldrew.com/src/app/components/terminal/terminal.component.ts"
    "angualr-k8s.milldrew.com/src/app/components/exam-session/exam-session.component.ts"
    "angualr-k8s.milldrew.com/src/app/components/exam-results/exam-results.component.ts"
)

for component in "${COMPONENTS[@]}"; do
    if [ ! -f "$component" ]; then
        echo "❌ $component not found"
        exit 1
    fi
done
echo "✅ All Angular components exist"
echo ""

# Check if Angular dependencies are installed
echo "📦 Checking Angular dependencies..."
if [ ! -d "angualr-k8s.milldrew.com/node_modules" ]; then
    echo "⚠️  Angular dependencies not installed"
    echo "   Run: cd angualr-k8s.milldrew.com && npm install"
else
    echo "✅ Angular dependencies installed"
fi
echo ""

# Check if K3s control-plane dependencies are installed
echo "📦 Checking K3s control-plane dependencies..."
if [ ! -d "k3s/control-plane-server/node_modules" ]; then
    echo "⚠️  K3s control-plane dependencies not installed"
    echo "   Run: cd k3s/control-plane-server && npm install"
else
    echo "✅ K3s control-plane dependencies installed"
fi
echo ""

echo "=========================================="
echo "✅ System verification complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Install K3s control-plane deps: cd k3s/control-plane-server && npm install"
echo "   2. Build K3s image: cd k3s && ./build.sh"
echo "   3. Start K3s cluster: docker-compose up -d"
echo "   4. Install Angular deps: cd angualr-k8s.milldrew.com && npm install"
echo "   5. Build Angular app: npm run build"
echo "   6. Start Angular SSR: npm run serve:ssr:angualr-k8s.milldrew.com"
echo "   7. Open browser: http://localhost:4000"
echo ""
