/**
 * Execution status enum
 * Represents the current state of an execution
 */
export enum ExecutionStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  INVOICED = 'INVOICED',
  CANCELLED = 'CANCELLED',
}
