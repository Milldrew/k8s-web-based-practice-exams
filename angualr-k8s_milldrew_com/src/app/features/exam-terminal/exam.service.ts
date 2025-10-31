import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Question {
  id: number;
  question: string;
  solution: string;
}

export interface CheckAnswerResponse {
  correct: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExamService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  getCurrentQuestion(): Observable<Question> {
    return this.http.get<Question>(`${this.apiUrl}/question`);
  }

  checkAnswer(answer: string): Observable<CheckAnswerResponse> {
    return this.http.post<CheckAnswerResponse>(`${this.apiUrl}/is-correct`, { answer });
  }

  resetQuestions(): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset`, {});
  }
}
