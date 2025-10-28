// Mock data for questions and solutions
const mockQuestions = [
  {
    id: 1,
    question: "Create a pod named nginx-pod using the nginx image",
    solution: "kubectl run nginx-pod --image=nginx",
    validationCommand: "kubectl get pod nginx-pod -o jsonpath='{.status.phase}'"
  },
  {
    id: 2,
    question: "Create a deployment named web-deploy with 3 replicas using nginx image",
    solution: "kubectl create deployment web-deploy --image=nginx --replicas=3",
    validationCommand: "kubectl get deployment web-deploy -o jsonpath='{.spec.replicas}'"
  },
  {
    id: 3,
    question: "Create a service named nginx-service to expose port 80",
    solution: "kubectl expose deployment nginx-deploy --name=nginx-service --port=80 --target-port=80",
    validationCommand: "kubectl get service nginx-service -o jsonpath='{.spec.ports[0].port}'"
  }
];

// Current question index (in a real app, this would be per-user)
let currentQuestionIndex = 0;

/**
 * Get the current question
 * @returns {Object} Question object with id, question, and solution
 */
function getCurrentQuestion() {
  if (currentQuestionIndex >= mockQuestions.length) {
    currentQuestionIndex = 0;
  }
  return mockQuestions[currentQuestionIndex];
}

/**
 * Check if the user's answer is correct
 * @param {string} userAnswer - The user's submitted answer
 * @returns {boolean} True if correct, false otherwise
 */
function isCorrect(userAnswer) {
  const currentQuestion = getCurrentQuestion();

  // Simple string comparison (case-insensitive, trimmed)
  // In a real implementation, you might want more sophisticated validation
  const normalizedAnswer = userAnswer.trim().toLowerCase();
  const normalizedSolution = currentQuestion.solution.trim().toLowerCase();

  // Check if the answer matches the solution (allowing for minor variations)
  const isMatch = normalizedAnswer === normalizedSolution ||
                  normalizedAnswer.includes(normalizedSolution) ||
                  normalizedSolution.includes(normalizedAnswer);

  if (isMatch) {
    // Move to next question if correct
    currentQuestionIndex++;
  }

  return isMatch;
}

/**
 * Reset to first question
 */
function resetQuestions() {
  currentQuestionIndex = 0;
}

module.exports = {
  isCorrect,
  getCurrentQuestion,
  resetQuestions
};
