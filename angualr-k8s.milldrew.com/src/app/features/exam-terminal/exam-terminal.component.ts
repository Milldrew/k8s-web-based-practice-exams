import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TerminalWebsocketService } from './terminal-websocket.service';
import { ExamService } from './exam.service';

@Component({
  selector: 'app-exam-terminal',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './exam-terminal.component.html',
  styleUrl: './exam-terminal.component.scss'
})
export class ExamTerminalComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('terminal', { static: false }) terminalDiv!: ElementRef;

  certType: string = '';
  examId: string = '';
  terminal: any = null;
  fitAddon: any = null;
  currentQuestion: any = null;
  isLoading = true;
  showSolution = false;
  isBrowser: boolean;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wsService: TerminalWebsocketService,
    private examService: ExamService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.certType = params['certType'];
      this.examId = params['examId'];
    });

    this.loadQuestion();
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      this.initTerminal();
    }
  }

  ngOnDestroy(): void {
    this.wsService.disconnect();
    if (this.terminal) {
      this.terminal.dispose();
    }
  }

  loadQuestion(): void {
    this.examService.getCurrentQuestion().subscribe({
      next: (question) => {
        this.currentQuestion = question;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading question:', error);
        this.isLoading = false;
      }
    });
  }

  async initTerminal(): Promise<void> {
    if (!this.isBrowser) return;

    // Dynamically import xterm only in the browser
    const { Terminal } = await import('@xterm/xterm');
    const { FitAddon } = await import('@xterm/addon-fit');

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
        brightWhite: '#e5e5e5'
      }
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);

    if (this.terminalDiv) {
      this.terminal.open(this.terminalDiv.nativeElement);
      this.fitAddon.fit();
    }

    // Connect to WebSocket
    const wsUrl = 'ws://localhost:3000';
    this.wsService.connect(wsUrl).subscribe({
      next: (message) => {
        if (message.type === 'output' && message.data && this.terminal) {
          this.terminal.write(message.data);
        } else if (message.type === 'connected') {
          console.log('Terminal connected:', message.sessionId);
        }
      },
      error: (error) => {
        console.error('WebSocket error:', error);
      }
    });

    // Send input to WebSocket
    this.terminal.onData((data: string) => {
      this.wsService.sendInput(data);
    });

    // Handle terminal resize
    window.addEventListener('resize', () => {
      if (this.fitAddon && this.terminal) {
        this.fitAddon.fit();
        this.wsService.resize(this.terminal.cols, this.terminal.rows);
      }
    });
  }

  toggleSolution(): void {
    this.showSolution = !this.showSolution;
  }

  nextQuestion(): void {
    // This would navigate to next question or finish exam
    console.log('Next question clicked');
  }

  goBack(): void {
    this.router.navigate([`/${this.certType}`]);
  }

  giveUp(): void {
    this.showSolution = true;
  }
}
