import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { ExamListService, Exam } from './exam-list.service';

@Component({
  selector: 'app-exam-list',
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule],
  templateUrl: './exam-list.component.html',
  styleUrl: './exam-list.component.scss'
})
export class ExamListComponent implements OnInit {
  certType: string = '';
  exams: Exam[] = [];
  certName: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private examListService: ExamListService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.certType = params['certType'];
      const data = this.examListService.getExamsForCert(this.certType);
      if (data) {
        this.certName = data.name;
        this.exams = data.exams;
      }
    });
  }

  startExam(examId: string): void {
    this.router.navigate([`/${this.certType}/${examId}`]);
  }

  getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'beginner': return 'primary';
      case 'intermediate': return 'accent';
      case 'advanced': return 'warn';
      default: return 'primary';
    }
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
