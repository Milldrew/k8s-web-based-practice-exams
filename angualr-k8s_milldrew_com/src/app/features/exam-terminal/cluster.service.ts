import { Injectable } from '@angular/core';
import { WebsocketService } from './websocket.service';
import { Observable } from 'rxjs';

export interface ClusterStatus {
  status: 'ready' | 'resetting' | 'configuring' | 'error';
  message: string;
}

export interface ResetClusterOptions {
  namespace?: string;
  statefulSetName?: string;
}

export interface ApplyManifestsOptions {
  manifests: string;
  sessionId: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClusterService {
  constructor(private ws: WebsocketService) {}

  getClusterStatus(): Observable<ClusterStatus> {
    return this.ws.on<ClusterStatus>('cluster-status');
  }

  resetCluster(options: ResetClusterOptions = {}): Observable<{ success: boolean; error?: string }> {
    this.ws.emit('reset-cluster', {
      namespace: options.namespace || 'default',
      statefulSetName: options.statefulSetName
    });

    return this.ws.on<{ success: boolean; error?: string }>('cluster-reset-complete');
  }

  applyManifests(options: ApplyManifestsOptions): Observable<{ success: boolean; output?: string; error?: string }> {
    this.ws.emit('apply-manifests', options);

    return this.ws.on<{ success: boolean; output?: string; error?: string }>('manifests-applied');
  }

  checkAnswer(validationCommand: string, sessionId: string): Observable<{ success: boolean; result: any }> {
    this.ws.emit('check-answer', {
      validationCommand,
      sessionId
    });

    return this.ws.on<{ success: boolean; result: any }>('answer-checked');
  }
}
