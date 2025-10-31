import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Question {
  id: number;
  questionNumber: number;
  questionText: string;
  solution: string;
  validationCommand: string;
  manifests?: string;
  points: number;
}

export interface Exam {
  id: number;
  slug: string;
  examType: 'CKA' | 'CKS' | 'CKAD';
  examName: string;
  description: string;
  questions: Question[];
}

export interface QuestionAnswer {
  questionId: number;
  questionNumber: number;
  isCorrect: boolean;
  answerData?: any;
  answeredAt: Date;
}

export interface ExamAttempt {
  sessionId: string;
  examId: number;
  examType: string;
  examName: string;
  startedAt: Date;
  completedAt?: Date;
  currentQuestionIndex: number;
  answers: QuestionAnswer[];
  totalScore: number;
  maxScore: number;
  status: 'in_progress' | 'completed';
}

@Injectable({
  providedIn: 'root'
})
export class ExamDataService {
  private exams: Exam[] = [
    {
      id: 1,
      slug: 'cka-a',
      examType: 'CKA',
      examName: 'CKA Practice Exam 1',
      description: 'Certified Kubernetes Administrator - Practice Exam 1',
      questions: [
        {
          id: 1,
          questionNumber: 1,
          questionText: 'Create a deployment named "nginx-deploy" with 3 replicas using the nginx:latest image in the default namespace.',
          solution: 'kubectl create deployment nginx-deploy --image=nginx:latest --replicas=3',
          validationCommand: 'kubectl get deployment nginx-deploy -o json 2>/dev/null | jq -e ".spec.replicas == 3 and .spec.template.spec.containers[0].image == \\"nginx:latest\\" and (.status.readyReplicas // 0) == 3" && echo \'{"correct": true, "message": "Deployment created successfully"}\' || echo \'{"correct": false, "message": "Deployment not found or incorrect configuration"}\'',
          points: 1
        },
        {
          id: 2,
          questionNumber: 2,
          questionText: 'Create a service named "nginx-service" that exposes the nginx-deploy deployment on port 80.',
          solution: 'kubectl expose deployment nginx-deploy --name=nginx-service --port=80',
          validationCommand: 'kubectl get service nginx-service -o json 2>/dev/null | jq -e ".spec.ports[0].port == 80" && echo \'{"correct": true, "message": "Service created successfully"}\' || echo \'{"correct": false, "message": "Service not found or incorrect port"}\'',
          points: 1
        },
        {
          id: 3,
          questionNumber: 3,
          questionText: 'Scale the nginx-deploy deployment to 5 replicas.',
          solution: 'kubectl scale deployment nginx-deploy --replicas=5',
          validationCommand: 'kubectl get deployment nginx-deploy -o json 2>/dev/null | jq -e ".spec.replicas == 5 and (.status.readyReplicas // 0) == 5" && echo \'{"correct": true, "message": "Deployment scaled successfully"}\' || echo \'{"correct": false, "message": "Deployment not scaled correctly"}\'',
          points: 1
        },
        {
          id: 4,
          questionNumber: 4,
          questionText: 'Create a namespace named "production".',
          solution: 'kubectl create namespace production',
          validationCommand: 'kubectl get namespace production 2>/dev/null && echo \'{"correct": true, "message": "Namespace created successfully"}\' || echo \'{"correct": false, "message": "Namespace not found"}\'',
          points: 1
        },
        {
          id: 5,
          questionNumber: 5,
          questionText: 'Create a pod named "test-pod" using the busybox image that runs the command "sleep 3600".',
          solution: 'kubectl run test-pod --image=busybox --command -- sleep 3600',
          validationCommand: 'kubectl get pod test-pod -o json 2>/dev/null | jq -e ".spec.containers[0].image == \\"busybox\\" and .spec.containers[0].command[0] == \\"sleep\\"" && echo \'{"correct": true, "message": "Pod created successfully"}\' || echo \'{"correct": false, "message": "Pod not found or incorrect configuration"}\'',
          points: 1
        }
      ]
    },
    {
      id: 2,
      slug: 'cks-a',
      examType: 'CKS',
      examName: 'CKS Practice Exam 1',
      description: 'Certified Kubernetes Security Specialist - Practice Exam 1',
      questions: [
        {
          id: 6,
          questionNumber: 1,
          questionText: 'Create a NetworkPolicy named "deny-all" that denies all ingress traffic in the default namespace.',
          solution: 'kubectl create -f - <<EOF\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: deny-all\n  namespace: default\nspec:\n  podSelector: {}\n  policyTypes:\n  - Ingress\nEOF',
          validationCommand: 'kubectl get networkpolicy deny-all -n default 2>/dev/null && echo \'{"correct": true, "message": "NetworkPolicy created successfully"}\' || echo \'{"correct": false, "message": "NetworkPolicy not found"}\'',
          points: 1
        }
      ]
    },
    {
      id: 3,
      slug: 'ckad-a',
      examType: 'CKAD',
      examName: 'CKAD Practice Exam 1',
      description: 'Certified Kubernetes Application Developer - Practice Exam 1',
      questions: [
        {
          id: 7,
          questionNumber: 1,
          questionText: 'Create a ConfigMap named "app-config" with key "env" and value "production".',
          solution: 'kubectl create configmap app-config --from-literal=env=production',
          validationCommand: 'kubectl get configmap app-config -o json 2>/dev/null | jq -e ".data.env == \\"production\\"" && echo \'{"correct": true, "message": "ConfigMap created successfully"}\' || echo \'{"correct": false, "message": "ConfigMap not found or incorrect data"}\'',
          points: 1
        }
      ]
    }
  ];

  private currentAttempt$ = new BehaviorSubject<ExamAttempt | null>(null);
  private examHistory: ExamAttempt[] = [];

  constructor() {
    this.loadFromSessionStorage();
  }

  getExams(): Exam[] {
    return this.exams;
  }

  getExamById(examId: number): Exam | undefined {
    return this.exams.find(e => e.id === examId);
  }

  getExamBySlug(slug: string): Exam | undefined {
    return this.exams.find(e => e.slug === slug);
  }

  getExamsByType(examType: 'CKA' | 'CKS' | 'CKAD'): Exam[] {
    return this.exams.filter(e => e.examType === examType);
  }

  startExam(examId: number): ExamAttempt | null {
    const exam = this.getExamById(examId);
    if (!exam) return null;

    const attempt: ExamAttempt = {
      sessionId: this.generateSessionId(),
      examId: exam.id,
      examType: exam.examType,
      examName: exam.examName,
      startedAt: new Date(),
      currentQuestionIndex: 0,
      answers: [],
      totalScore: 0,
      maxScore: exam.questions.reduce((sum, q) => sum + q.points, 0),
      status: 'in_progress'
    };

    this.currentAttempt$.next(attempt);
    this.saveToSessionStorage();
    return attempt;
  }

  getCurrentAttempt(): Observable<ExamAttempt | null> {
    return this.currentAttempt$.asObservable();
  }

  getCurrentAttemptValue(): ExamAttempt | null {
    return this.currentAttempt$.value;
  }

  recordAnswer(questionId: number, questionNumber: number, isCorrect: boolean, answerData?: any): void {
    const attempt = this.currentAttempt$.value;
    if (!attempt) return;

    const exam = this.getExamById(attempt.examId);
    if (!exam) return;

    const question = exam.questions.find(q => q.id === questionId);
    if (!question) return;

    const answer: QuestionAnswer = {
      questionId,
      questionNumber,
      isCorrect,
      answerData,
      answeredAt: new Date()
    };

    // Update or add answer
    const existingIndex = attempt.answers.findIndex(a => a.questionId === questionId);
    if (existingIndex >= 0) {
      attempt.answers[existingIndex] = answer;
    } else {
      attempt.answers.push(answer);
    }

    // Recalculate score
    attempt.totalScore = attempt.answers
      .filter(a => a.isCorrect)
      .reduce((sum, a) => {
        const q = exam.questions.find(q => q.id === a.questionId);
        return sum + (q?.points || 0);
      }, 0);

    this.currentAttempt$.next(attempt);
    this.saveToSessionStorage();
  }

  moveToNextQuestion(): void {
    const attempt = this.currentAttempt$.value;
    if (!attempt) return;

    const exam = this.getExamById(attempt.examId);
    if (!exam) return;

    if (attempt.currentQuestionIndex < exam.questions.length - 1) {
      attempt.currentQuestionIndex++;
      this.currentAttempt$.next(attempt);
      this.saveToSessionStorage();
    }
  }

  moveToPreviousQuestion(): void {
    const attempt = this.currentAttempt$.value;
    if (!attempt) return;

    if (attempt.currentQuestionIndex > 0) {
      attempt.currentQuestionIndex--;
      this.currentAttempt$.next(attempt);
      this.saveToSessionStorage();
    }
  }

  completeExam(): void {
    const attempt = this.currentAttempt$.value;
    if (!attempt) return;

    attempt.completedAt = new Date();
    attempt.status = 'completed';

    this.examHistory.push(attempt);
    this.currentAttempt$.next(null);
    this.saveToSessionStorage();
  }

  getExamHistory(): ExamAttempt[] {
    return this.examHistory;
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private saveToSessionStorage(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('currentAttempt', JSON.stringify(this.currentAttempt$.value));
      sessionStorage.setItem('examHistory', JSON.stringify(this.examHistory));
    }
  }

  private loadFromSessionStorage(): void {
    if (typeof sessionStorage !== 'undefined') {
      const currentAttempt = sessionStorage.getItem('currentAttempt');
      if (currentAttempt) {
        const attempt = JSON.parse(currentAttempt);
        // Convert date strings back to Date objects
        attempt.startedAt = new Date(attempt.startedAt);
        if (attempt.completedAt) attempt.completedAt = new Date(attempt.completedAt);
        attempt.answers = attempt.answers.map((a: any) => ({
          ...a,
          answeredAt: new Date(a.answeredAt)
        }));
        this.currentAttempt$.next(attempt);
      }

      const history = sessionStorage.getItem('examHistory');
      if (history) {
        this.examHistory = JSON.parse(history).map((attempt: any) => ({
          ...attempt,
          startedAt: new Date(attempt.startedAt),
          completedAt: attempt.completedAt ? new Date(attempt.completedAt) : undefined,
          answers: attempt.answers.map((a: any) => ({
            ...a,
            answeredAt: new Date(a.answeredAt)
          }))
        }));
      }
    }
  }

  clearHistory(): void {
    this.examHistory = [];
    this.currentAttempt$.next(null);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('currentAttempt');
      sessionStorage.removeItem('examHistory');
    }
  }
}
