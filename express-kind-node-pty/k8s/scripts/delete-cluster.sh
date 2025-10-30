#!/bin/bash
set -e

# Script to delete a KIND cluster
# Usage: ./delete-cluster.sh <exam-type> <set> <question>
# Example: ./delete-cluster.sh cka a 1

EXAM_TYPE=$1
SET=$2
QUESTION=$3

if [ -z "$EXAM_TYPE" ] || [ -z "$SET" ] || [ -z "$QUESTION" ]; then
    echo "Usage: $0 <exam-type> <set> <question>"
    echo "Example: $0 cka a 1"
    echo ""
    echo "Or to delete all clusters:"
    echo "  kind delete clusters --all"
    exit 1
fi

CLUSTER_NAME="kind-${EXAM_TYPE}-${SET}-${QUESTION}"

# Check if cluster exists
if ! kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
    echo "Cluster $CLUSTER_NAME does not exist"
    echo ""
    echo "Existing clusters:"
    kind get clusters 2>/dev/null || echo "  (none)"
    exit 1
fi

echo "Deleting KIND cluster: $CLUSTER_NAME"
read -p "Are you sure? (y/N) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    kind delete cluster --name "$CLUSTER_NAME"
    echo ""
    echo "Cluster $CLUSTER_NAME deleted successfully"
else
    echo "Cancelled"
    exit 0
fi
