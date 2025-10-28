import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { ExamListComponent } from './features/exam-list/exam-list.component';
import { ExamTerminalComponent } from './features/exam-terminal/exam-terminal.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: ':certType/:examId',
    component: ExamTerminalComponent
  },
  {
    path: ':certType',
    component: ExamListComponent
  }
];
