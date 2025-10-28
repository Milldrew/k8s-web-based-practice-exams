import { Injectable } from '@angular/core';

export interface Exam {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  questionsCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class ExamListService {
  private examData: Record<string, { name: string; exams: Exam[] }> = {
    cka: {
      name: 'Certified Kubernetes Administrator',
      exams: [
        {
          id: 'cka-a',
          name: 'CKA Practice Exam A',
          description: 'Focus on cluster architecture, installation, and configuration',
          difficulty: 'beginner',
          duration: '2 hours',
          questionsCount: 17
        },
        {
          id: 'cka-b',
          name: 'CKA Practice Exam B',
          description: 'Workload scheduling, storage, and troubleshooting',
          difficulty: 'intermediate',
          duration: '2 hours',
          questionsCount: 17
        },
        {
          id: 'cka-c',
          name: 'CKA Practice Exam C',
          description: 'Full-spectrum exam covering all CKA domains',
          difficulty: 'advanced',
          duration: '2 hours',
          questionsCount: 17
        }
      ]
    },
    ckad: {
      name: 'Certified Kubernetes Application Developer',
      exams: [
        {
          id: 'ckad-a',
          name: 'CKAD Practice Exam A',
          description: 'Application design, build, and deployment basics',
          difficulty: 'beginner',
          duration: '2 hours',
          questionsCount: 15
        },
        {
          id: 'ckad-b',
          name: 'CKAD Practice Exam B',
          description: 'Services, networking, state persistence, and observability',
          difficulty: 'intermediate',
          duration: '2 hours',
          questionsCount: 15
        }
      ]
    },
    cks: {
      name: 'Certified Kubernetes Security Specialist',
      exams: [
        {
          id: 'cks-a',
          name: 'CKS Practice Exam A',
          description: 'Cluster setup, hardening, and system security',
          difficulty: 'beginner',
          duration: '2 hours',
          questionsCount: 16
        },
        {
          id: 'cks-b',
          name: 'CKS Practice Exam B',
          description: 'Supply chain security, runtime security, and monitoring',
          difficulty: 'intermediate',
          duration: '2 hours',
          questionsCount: 16
        }
      ]
    }
  };

  getExamsForCert(certType: string): { name: string; exams: Exam[] } | undefined {
    return this.examData[certType];
  }
}
