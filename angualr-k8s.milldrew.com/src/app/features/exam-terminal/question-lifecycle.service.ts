import { Injectable } from '@angular/core';
import { ClusterService } from './cluster.service';
import { ExamDataService, Question } from './exam-data.service';
import { WebsocketService } from './websocket.service';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';

export interface QuestionLifecycleState {
  phase: 'before' | 'during' | 'after';
  status: 'idle' | 'resetting' | 'configuring' | 'ready' | 'checking' | 'completed' | 'error';
  message: string;
  currentQuestion?: Question;
  isCorrect?: boolean;
  canProceed: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class QuestionLifecycleService {
  private state: QuestionLifecycleState = {
    phase: 'before',
    status: 'idle',
    message: 'Ready to start question',
    canProceed: false
  };

  constructor(
    private clusterService: ClusterService,
    private examDataService: ExamDataService,
    private wsService: WebsocketService
  ) {}

  /**
   * BEFORE PHASE: Reset cluster and apply manifests
   */
  async prepareQuestion(question: Question): Promise<void> {
    this.state = {
      phase: 'before',
      status: 'resetting',
      message: 'Resetting cluster...',
      currentQuestion: question,
      canProceed: false
    };

    try {
      // Step 1: Reset cluster by deleting all non-system pods
      console.log('Step 1: Resetting cluster...');
      const resetResult = await firstValueFrom(
        this.clusterService.resetCluster({ namespace: 'default' }).pipe(take(1))
      );

      if (!resetResult.success) {
        throw new Error(resetResult.error || 'Failed to reset cluster');
      }

      console.log('Cluster reset successfully');

      // Step 2: Apply manifests if any
      if (question.manifests) {
        this.state.status = 'configuring';
        this.state.message = 'Applying manifests...';

        const sessionId = this.wsService.getSessionId();
        if (!sessionId) {
          throw new Error('No active session');
        }

        console.log('Step 2: Applying manifests...');
        const manifestResult = await firstValueFrom(
          this.clusterService.applyManifests({
            manifests: question.manifests,
            sessionId
          }).pipe(take(1))
        );

        if (!manifestResult.success) {
          throw new Error(manifestResult.error || 'Failed to apply manifests');
        }

        console.log('Manifests applied successfully:', manifestResult.output);
      }

      // Step 3: Transition to DURING phase
      this.state = {
        phase: 'during',
        status: 'ready',
        message: 'Cluster is ready. You may begin working on the question.',
        currentQuestion: question,
        canProceed: true
      };

      console.log('Question preparation complete. Ready for student.');

    } catch (error: any) {
      this.state = {
        phase: 'before',
        status: 'error',
        message: error.message || 'Failed to prepare question',
        currentQuestion: question,
        canProceed: false
      };
      throw error;
    }
  }

  /**
   * DURING PHASE: Check student's work
   */
  async checkAnswer(): Promise<boolean> {
    if (!this.state.currentQuestion) {
      throw new Error('No current question');
    }

    this.state.status = 'checking';
    this.state.message = 'Checking your answer...';

    try {
      const sessionId = this.wsService.getSessionId();
      if (!sessionId) {
        throw new Error('No active session');
      }

      const result = await firstValueFrom(
        this.clusterService.checkAnswer(
          this.state.currentQuestion.validationCommand,
          sessionId
        ).pipe(take(1))
      );

      if (!result.success) {
        throw new Error('Validation failed');
      }

      // Parse the validation result
      let isCorrect = false;
      let validationData = result.result;

      // If result contains JSON with correct field
      if (validationData && typeof validationData === 'object') {
        if ('correct' in validationData) {
          isCorrect = validationData.correct === true;
        } else if (validationData.rawOutput) {
          // Raw output - check if it's truthy
          isCorrect = !!validationData.output;
        }
      }

      // Record the answer
      const attempt = this.examDataService.getCurrentAttemptValue();
      if (attempt && this.state.currentQuestion) {
        this.examDataService.recordAnswer(
          this.state.currentQuestion.id,
          this.state.currentQuestion.questionNumber,
          isCorrect,
          validationData
        );
      }

      // Transition to AFTER phase
      this.state = {
        phase: 'after',
        status: 'completed',
        message: isCorrect
          ? '✓ Correct! You may proceed to the next question.'
          : '✗ Incorrect. Review the solution and try again, or proceed to the next question.',
        currentQuestion: this.state.currentQuestion,
        isCorrect,
        canProceed: true
      };

      return isCorrect;

    } catch (error: any) {
      this.state.status = 'error';
      this.state.message = error.message || 'Failed to check answer';
      this.state.canProceed = false;
      throw error;
    }
  }

  /**
   * AFTER PHASE: Move to next question
   */
  async moveToNextQuestion(): Promise<void> {
    this.examDataService.moveToNextQuestion();

    // Reset to BEFORE phase for next question
    this.state = {
      phase: 'before',
      status: 'idle',
      message: 'Loading next question...',
      canProceed: false
    };
  }

  /**
   * Get current lifecycle state
   */
  getState(): QuestionLifecycleState {
    return { ...this.state };
  }

  /**
   * Check if student can interact with terminal
   */
  canUseTerminal(): boolean {
    return this.state.phase === 'during' && this.state.status === 'ready';
  }

  /**
   * Check if student can check their answer
   */
  canCheckAnswer(): boolean {
    return this.state.phase === 'during' && this.state.status === 'ready';
  }

  /**
   * Check if student can proceed to next question
   */
  canProceedToNext(): boolean {
    return this.state.phase === 'after' && this.state.canProceed;
  }

  /**
   * Reset lifecycle state
   */
  reset(): void {
    this.state = {
      phase: 'before',
      status: 'idle',
      message: 'Ready to start question',
      canProceed: false
    };
  }
}
