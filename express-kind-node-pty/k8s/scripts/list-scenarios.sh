#!/bin/bash

# Script to list all available practice exam scenarios
# Usage: ./list-scenarios.sh

echo "Available Practice Exam Scenarios"
echo "=================================="
echo ""

for overlay in ../overlays/*/*; do
    if [ -d "$overlay" ]; then
        scenario=$(echo "$overlay" | sed 's|../overlays/||')
        exam_type=$(echo "$scenario" | cut -d'/' -f1)
        question=$(echo "$scenario" | cut -d'/' -f2)

        if [ -f "$overlay/kustomization.yaml" ]; then
            cluster_type=$(grep "CLUSTER_TYPE=" "$overlay/kustomization.yaml" | cut -d'=' -f2 || echo "multi-node")
            question_text=$(grep "QUESTION_TEXT=" "$overlay/kustomization.yaml" | cut -d'=' -f2 || echo "N/A")

            echo "${exam_type} / ${question}"
            echo "  Cluster: kind-${exam_type}-${question/\//-}"
            echo "  Type: $cluster_type"
            echo "  Question: $question_text"
            echo ""
        fi
    fi
done

echo ""
echo "Commands:"
echo "  Create: ./create-cluster.sh <exam-type> <set> <question> [cluster-type]"
echo "  Deploy: ./deploy-scenario.sh <exam-type> <set> <question>"
echo "  Delete: ./delete-cluster.sh <exam-type> <set> <question>"
echo ""
echo "Current clusters:"
kind get clusters 2>/dev/null || echo "  (none)"
