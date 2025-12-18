import type { Message } from '@/types';
import type { UseCaseOutput } from '@/types';
import { useCaseService } from '@/services/UseCaseService';

const executions = new Map<string, UseCaseOutput>();

export async function handleUseCaseMessage(message: Message): Promise<any> {
  switch (message.type) {
    case 'EXECUTE_USE_CASE':
      const executionId = `exec_${Date.now()}`;
      console.log('Executing use case:', message.payload.useCaseId);
      const output = await useCaseService.execute(message.payload);
      executions.set(executionId, output);
      return { executionId, output };

    case 'GET_USE_CASES':
      return useCaseService.listUseCases();

    case 'GET_USE_CASE_STATUS':
      {
        const output = executions.get(message.payload.executionId);
        if (!output) {
          throw new Error('Unknown executionId');
        }
        return output;
      }

    default:
      throw new Error(`Unknown use case message type: ${message.type}`);
  }
}
