import { Routes } from '@angular/router';
import { ExamListComponent } from './features/exam-list/exam-list.component';
import { ExamTerminalComponent } from './features/exam-terminal/exam-terminal.component';

export const routes: Routes = [
  {
    path: ':certType/:examId',
    component: ExamTerminalComponent
  },
  {
    path: ':certType',
    component: ExamListComponent
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: ''
  }
];
