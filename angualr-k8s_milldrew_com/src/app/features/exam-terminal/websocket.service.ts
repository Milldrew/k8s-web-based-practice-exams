import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject, fromEvent } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket: Socket | null = null;
  private connected$ = new Subject<boolean>();
  private k3sConnected$ = new Subject<{ sessionId: string }>();
  private sessionId: string | null = null;

  constructor() {}

  connect(): Observable<boolean> {
    if (this.socket?.connected) {
      return this.connected$.asObservable();
    }

    // Connect to the Angular SSR server's Socket.IO endpoint
    this.socket = io('http://localhost:4000', {
      path: '/socket.io/',
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to SSR WebSocket server');
      this.connected$.next(true);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from SSR WebSocket server');
      this.connected$.next(false);
    });

    this.socket.on('k3s-connected', (data: { sessionId: string }) => {
      console.log('Connected to K3s cluster:', data.sessionId);
      this.k3sConnected$.next(data);
    });

    this.socket.on('k3s-disconnected', (data: { sessionId: string }) => {
      console.log('Disconnected from K3s cluster:', data.sessionId);
    });

    this.socket.on('k3s-error', (data: { error: string }) => {
      console.error('K3s connection error:', data.error);
    });

    return this.connected$.asObservable();
  }

  connectToK3s(sessionId: string): Observable<{ sessionId: string }> {
    this.sessionId = sessionId;
    if (this.socket) {
      this.socket.emit('connect-to-k3s', { sessionId });
    }
    return this.k3sConnected$.asObservable();
  }

  emit(eventName: string, data: any): void {
    if (this.socket) {
      this.socket.emit(eventName, data);
    }
  }

  on<T = any>(eventName: string): Observable<T> {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    return fromEvent(this.socket, eventName);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}
