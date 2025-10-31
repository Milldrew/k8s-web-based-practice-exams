// const { Terminal } = await import('@xterm/xterm');
// const { FitAddon } = await import('@xterm/addon-fit');
import { Terminal, FitAddon } from '@xterm/xterm';
import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WebsocketService } from './websocket.service';
import { ExamDataService, Exam, Question, ExamAttempt } from './exam-data.service';
import { QuestionLifecycleService, QuestionLifecycleState } from './question-lifecycle.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-exam-terminal',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatCardModule, MatProgressSpinnerModule],
  templateUrl: './exam-terminal.component.html',
  styleUrl: './exam-terminal.component.scss',
})
export class ExamTerminalComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('terminal', { static: false }) terminalDiv!: ElementRef;

  certType: string = '';
  examSlug: string = '';
  terminal: any = null;
  fitAddon: any = null;
  exam: Exam | null = null;
  attempt: ExamAttempt | null = null;
  currentQuestion: Question | null = null;
  lifecycleState: QuestionLifecycleState | null = null;
  isLoading = true;
  showSolution = false;
  isCheckingAnswer = false;
  isBrowser: boolean;
  subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wsService: WebsocketService,
    private examDataService: ExamDataService,
    private lifecycleService: QuestionLifecycleService,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    let wsConnected = false;
    let routeParamsReady = false;

    const tryLoadExam = () => {
      if (wsConnected && routeParamsReady && this.examSlug) {
        console.log('Both WebSocket and route params ready, loading exam...');
        this.loadExam();
      }
    };

    // Get exam slug from route
    this.route.params.subscribe((params) => {
      this.certType = params['certType'];
      this.examSlug = params['examId'] || ''; // This is actually a slug like 'cka-a'
      console.log('Route params ready, examSlug:', this.examSlug);
      routeParamsReady = true;
      tryLoadExam();
    });

    // Connect to websocket
    if (this.isBrowser) {
      this.wsService.connect().subscribe((connected) => {
        if (connected) {
          console.log('Connected to WebSocket');
          wsConnected = true;
          tryLoadExam();
        }
      });

      // Subscribe to K3s connection
      this.subscriptions.push(
        this.wsService.on('k3s-connected').subscribe(() => {
          console.log('K3s connected');
          if (this.attempt) {
            this.createTerminalSession(this.attempt.sessionId);
          }
        }),
      );

      // Subscribe to terminal created confirmation
      this.subscriptions.push(
        this.wsService.on('terminal-created').subscribe((data: any) => {
          console.log('Terminal session created:', data);
          if (this.terminal) {
            this.terminal.write('\r\nTerminal session established!\r\n');
          }
        }),
      );

      // Subscribe to terminal output
      this.subscriptions.push(
        this.wsService.on<string>('terminal-output').subscribe((data) => {
          if (this.terminal) {
            this.terminal.write(data);
          }
        }),
      );

      // Subscribe to exam attempt changes
      this.subscriptions.push(
        this.examDataService.getCurrentAttempt().subscribe((attempt) => {
          if (attempt) {
            this.attempt = attempt;
            this.loadCurrentQuestion();
          }
        }),
      );
    }
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      this.initTerminal();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.wsService.disconnect();
    this.lifecycleService.reset();
    if (this.terminal) {
      this.terminal.dispose();
    }
  }

  loadExam(): void {
    const foundExam = this.examDataService.getExamBySlug(this.examSlug);
    if (!foundExam) {
      console.error('Exam not found with slug:', this.examSlug);
      this.router.navigate(['/']);
      return;
    }
    this.exam = foundExam;

    // Check for existing attempt or start new one
    const existingAttempt = this.examDataService.getCurrentAttemptValue();
    if (existingAttempt && existingAttempt.examId === foundExam.id) {
      this.attempt = existingAttempt;
    } else {
      this.attempt = this.examDataService.startExam(foundExam.id);
    }

    if (!this.attempt) {
      console.error('Failed to start exam');
      this.router.navigate(['/']);
      return;
    }

    // Connect to K3s
    this.wsService.connectToK3s(this.attempt.sessionId);

    // Load first question
    this.loadCurrentQuestion();
  }

  loadCurrentQuestion(): void {
    if (!this.exam || !this.attempt) return;

    const questionIndex = this.attempt.currentQuestionIndex;
    this.currentQuestion = this.exam.questions[questionIndex] || null;

    if (this.currentQuestion) {
      this.showSolution = false;
      this.isLoading = false;
      this.prepareQuestion();
    }
  }

  async prepareQuestion(): Promise<void> {
    if (!this.currentQuestion) return;

    try {
      this.lifecycleState = this.lifecycleService.getState();
      await this.lifecycleService.prepareQuestion(this.currentQuestion);
      this.lifecycleState = this.lifecycleService.getState();
    } catch (error) {
      console.error('Failed to prepare question:', error);
      this.lifecycleState = this.lifecycleService.getState();
    }
  }

  async initTerminal(): Promise<void> {
    if (!this.isBrowser) return;

    // Dynamically import xterm only in the browser

    console.log(Terminal, FitAddon);
    this.terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);

    if (this.terminalDiv) {
      this.terminal.open(this.terminalDiv.nativeElement);
      setTimeout(() => {
        if (this.fitAddon) {
          this.fitAddon.fit();
        }
      }, 0);
    }

    // Send input to WebSocket
    this.terminal.onData((data: string) => {
      this.wsService.emit('terminal-input', data);
    });

    // Handle terminal resize
    window.addEventListener('resize', () => {
      if (this.fitAddon && this.terminal) {
        this.fitAddon.fit();
        const dims = this.fitAddon.proposeDimensions();
        if (dims) {
          this.wsService.emit('terminal-resize', {
            cols: dims.cols,
            rows: dims.rows,
          });
        }
      }
    });

    this.terminal.write('Connecting to K8s cluster...\r\n');
  }

  createTerminalSession(sessionId: string): void {
    if (!this.terminal || !this.fitAddon) return;

    const dims = this.fitAddon.proposeDimensions();
    this.wsService.emit('create-terminal', {
      sessionId,
      cols: dims?.cols || 80,
      rows: dims?.rows || 24,
    });
  }

  async checkMyWork(): Promise<void> {
    if (!this.lifecycleService.canCheckAnswer()) {
      return;
    }

    this.isCheckingAnswer = true;

    try {
      const isCorrect = await this.lifecycleService.checkAnswer();
      this.lifecycleState = this.lifecycleService.getState();
      console.log('Answer checked:', isCorrect ? 'Correct' : 'Incorrect');
    } catch (error) {
      console.error('Failed to check answer:', error);
      this.lifecycleState = this.lifecycleService.getState();
    } finally {
      this.isCheckingAnswer = false;
    }
  }

  toggleSolution(): void {
    this.showSolution = !this.showSolution;
  }

  async nextQuestion(): Promise<void> {
    if (!this.exam || !this.attempt) return;

    if (this.attempt.currentQuestionIndex < this.exam.questions.length - 1) {
      await this.lifecycleService.moveToNextQuestion();
      this.lifecycleState = this.lifecycleService.getState();
    } else {
      // Last question - complete exam
      this.completeExam();
    }
  }

  previousQuestion(): void {
    if (!this.attempt) return;

    if (this.attempt.currentQuestionIndex > 0) {
      this.examDataService.moveToPreviousQuestion();
    }
  }

  completeExam(): void {
    this.examDataService.completeExam();
    this.router.navigate(['/exam-results']);
  }

  goBack(): void {
    this.router.navigate([`/${this.certType}`]);
  }

  giveUp(): void {
    this.showSolution = true;
  }

  getProgress(): number {
    if (!this.exam || !this.attempt) return 0;
    return ((this.attempt.currentQuestionIndex + 1) / this.exam.questions.length) * 100;
  }

  canCheckAnswer(): boolean {
    return this.lifecycleService.canCheckAnswer() && !this.isCheckingAnswer;
  }

  canProceedToNext(): boolean {
    return this.lifecycleState?.phase === 'after' || false;
  }
}
