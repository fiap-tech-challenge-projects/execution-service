import { DomainException } from '@shared/exceptions'
import { ExecutionStatus } from '@shared/value-objects'

/**
 * Exception thrown when an invalid execution status transition is attempted
 */
export class InvalidExecutionStatusTransitionException extends DomainException {
  constructor(
    from: ExecutionStatus,
    to: ExecutionStatus,
    allowedStatuses: ExecutionStatus[],
  ) {
    super(
      `Invalid execution status transition from ${from} to ${to}. Allowed transitions: ${allowedStatuses.join(', ')}`,
      'INVALID_EXECUTION_STATUS_TRANSITION',
    )
  }
}
