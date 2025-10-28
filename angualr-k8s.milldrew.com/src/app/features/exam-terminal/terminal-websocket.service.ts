import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface TerminalMessage {
  type: 'output' | 'connected' | 'exit';
  data?: string;
  message?: string;
  sessionId?: string;
  exitCode?: number;
  signal?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TerminalWebsocketService {
  private ws: WebSocket | null = null;
  private messageSubject = new Subject<TerminalMessage>();
  public messages$ = this.messageSubject.asObservable();

  connect(url: string): Observable<TerminalMessage> {
    if (this.ws) {
      this.disconnect();
    }

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const message: TerminalMessage = JSON.parse(event.data);
        this.messageSubject.next(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return this.messages$;
  }

  sendInput(data: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'input', data }));
    }
  }

  resize(cols: number, rows: number): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
