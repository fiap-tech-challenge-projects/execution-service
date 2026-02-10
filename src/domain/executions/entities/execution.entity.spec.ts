import { Execution } from './execution.entity'
import { ExecutionTask } from './execution-task.entity'
import { ExecutionStatus, TaskStatus } from '@shared/value-objects'
import { InvalidExecutionStatusTransitionException } from '../exceptions'

describe('Execution Entity', () => {
  const serviceOrderId = 'order-123'
  const budgetId = 'budget-456'
  const estimatedDuration = 120 // 2 hours
  const technicianId = 'tech-789'
  const notes = 'Test execution notes'

  describe('create', () => {
    it('should create execution with SCHEDULED status', () => {
      const execution = Execution.create(
        serviceOrderId,
        budgetId,
        estimatedDuration,
      )

      expect(execution).toBeInstanceOf(Execution)
      expect(execution.serviceOrderId).toBe(serviceOrderId)
      expect(execution.budgetId).toBe(budgetId)
      expect(execution.status).toBe(ExecutionStatus.SCHEDULED)
      expect(execution.estimatedDuration).toBe(estimatedDuration)
      expect(execution.tasks).toHaveLength(0)
      expect(execution.startDate).toBeUndefined()
      expect(execution.endDate).toBeUndefined()
      expect(execution.actualDuration).toBeUndefined()
    })

    it('should create execution with optional fields', () => {
      const scheduledDate = new Date('2025-12-31')
      const execution = Execution.create(
        serviceOrderId,
        budgetId,
        estimatedDuration,
        scheduledDate,
        technicianId,
        notes,
      )

      expect(execution.scheduledDate).toEqual(scheduledDate)
      expect(execution.technicianId).toBe(technicianId)
      expect(execution.notes).toBe(notes)
    })

    it('should throw error when service order ID is empty', () => {
      expect(() => {
        Execution.create('', budgetId, estimatedDuration)
      }).toThrow('Service Order ID is required')
    })

    it('should throw error when service order ID is whitespace', () => {
      expect(() => {
        Execution.create('   ', budgetId, estimatedDuration)
      }).toThrow('Service Order ID is required')
    })

    it('should throw error when budget ID is empty', () => {
      expect(() => {
        Execution.create(serviceOrderId, '', estimatedDuration)
      }).toThrow('Budget ID is required')
    })

    it('should throw error when budget ID is whitespace', () => {
      expect(() => {
        Execution.create(serviceOrderId, '   ', estimatedDuration)
      }).toThrow('Budget ID is required')
    })

    it('should throw error when estimated duration is zero', () => {
      expect(() => {
        Execution.create(serviceOrderId, budgetId, 0)
      }).toThrow('Estimated duration must be positive')
    })

    it('should throw error when estimated duration is negative', () => {
      expect(() => {
        Execution.create(serviceOrderId, budgetId, -10)
      }).toThrow('Estimated duration must be positive')
    })

    it('should generate unique id for each execution', () => {
      const execution1 = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const execution2 = Execution.create(serviceOrderId, budgetId, estimatedDuration)

      expect(execution1.id).not.toBe(execution2.id)
      expect(execution1.id).toBeTruthy()
      expect(execution2.id).toBeTruthy()
    })
  })

  describe('start', () => {
    it('should start scheduled execution', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()

      expect(startedExecution.status).toBe(ExecutionStatus.IN_PROGRESS)
      expect(startedExecution.startDate).toBeInstanceOf(Date)
      expect(startedExecution.id).toBe(execution.id)
    })

    it('should update updatedAt timestamp', async () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const originalUpdatedAt = execution.updatedAt

      await new Promise(resolve => setTimeout(resolve, 10))

      const startedExecution = execution.start()

      expect(startedExecution.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })

    it('should throw error when starting from IN_PROGRESS status', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()

      expect(() => {
        startedExecution.start()
      }).toThrow(InvalidExecutionStatusTransitionException)
    })

    it('should throw error when starting from COMPLETED status', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()
      const completedExecution = startedExecution.complete()

      expect(() => {
        completedExecution.start()
      }).toThrow(InvalidExecutionStatusTransitionException)
    })

    it('should throw error when starting from CANCELLED status', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const cancelledExecution = execution.cancel()

      expect(() => {
        cancelledExecution.start()
      }).toThrow(InvalidExecutionStatusTransitionException)
    })
  })

  describe('pause', () => {
    it('should pause in-progress execution', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()
      const pausedExecution = startedExecution.pause()

      expect(pausedExecution.status).toBe(ExecutionStatus.PAUSED)
      expect(pausedExecution.startDate).toBe(startedExecution.startDate)
    })

    it('should throw error when pausing from SCHEDULED status', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)

      expect(() => {
        execution.pause()
      }).toThrow(InvalidExecutionStatusTransitionException)
    })

    it('should throw error when pausing from PAUSED status', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()
      const pausedExecution = startedExecution.pause()

      expect(() => {
        pausedExecution.pause()
      }).toThrow(InvalidExecutionStatusTransitionException)
    })

    it('should throw error when pausing from COMPLETED status', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()
      const completedExecution = startedExecution.complete()

      expect(() => {
        completedExecution.pause()
      }).toThrow(InvalidExecutionStatusTransitionException)
    })
  })

  describe('resume', () => {
    it('should resume paused execution', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()
      const pausedExecution = startedExecution.pause()
      const resumedExecution = pausedExecution.resume()

      expect(resumedExecution.status).toBe(ExecutionStatus.IN_PROGRESS)
      expect(resumedExecution.startDate).toBe(startedExecution.startDate)
    })

    it('should allow resuming from SCHEDULED status (acts like start)', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)

      // Resume from SCHEDULED transitions to IN_PROGRESS (like start)
      const resumedExecution = execution.resume()
      expect(resumedExecution.status).toBe(ExecutionStatus.IN_PROGRESS)
    })

    it('should throw error when resuming from IN_PROGRESS status', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()

      // Cannot transition from IN_PROGRESS to IN_PROGRESS
      expect(() => {
        startedExecution.resume()
      }).toThrow(InvalidExecutionStatusTransitionException)
    })

    it('should throw error when resuming from COMPLETED status', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()
      const completedExecution = startedExecution.complete()

      expect(() => {
        completedExecution.resume()
      }).toThrow(InvalidExecutionStatusTransitionException)
    })
  })

  describe('complete', () => {
    it('should complete in-progress execution', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()
      const completedExecution = startedExecution.complete()

      expect(completedExecution.status).toBe(ExecutionStatus.COMPLETED)
      expect(completedExecution.endDate).toBeInstanceOf(Date)
      expect(completedExecution.actualDuration).toBeGreaterThanOrEqual(0)
    })

    it('should calculate actual duration from start date', async () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()

      await new Promise(resolve => setTimeout(resolve, 100))

      const completedExecution = startedExecution.complete()

      expect(completedExecution.actualDuration).toBeGreaterThanOrEqual(0)
    })

    it('should throw error when completing from SCHEDULED status', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)

      expect(() => {
        execution.complete()
      }).toThrow(InvalidExecutionStatusTransitionException)
    })

    it('should throw error when completing from PAUSED status', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()
      const pausedExecution = startedExecution.pause()

      expect(() => {
        pausedExecution.complete()
      }).toThrow(InvalidExecutionStatusTransitionException)
    })

    it('should throw error when completing already completed execution', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()
      const completedExecution = startedExecution.complete()

      expect(() => {
        completedExecution.complete()
      }).toThrow(InvalidExecutionStatusTransitionException)
    })
  })

  describe('markInvoiced', () => {
    it('should mark completed execution as invoiced', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()
      const completedExecution = startedExecution.complete()
      const invoicedExecution = completedExecution.markInvoiced()

      expect(invoicedExecution.status).toBe(ExecutionStatus.INVOICED)
    })

    it('should throw error when invoicing from SCHEDULED status', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)

      expect(() => {
        execution.markInvoiced()
      }).toThrow(InvalidExecutionStatusTransitionException)
    })

    it('should throw error when invoicing from IN_PROGRESS status', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()

      expect(() => {
        startedExecution.markInvoiced()
      }).toThrow(InvalidExecutionStatusTransitionException)
    })

    it('should throw error when invoicing already invoiced execution', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()
      const completedExecution = startedExecution.complete()
      const invoicedExecution = completedExecution.markInvoiced()

      expect(() => {
        invoicedExecution.markInvoiced()
      }).toThrow(InvalidExecutionStatusTransitionException)
    })
  })

  describe('cancel', () => {
    it('should cancel scheduled execution', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const cancelledExecution = execution.cancel()

      expect(cancelledExecution.status).toBe(ExecutionStatus.CANCELLED)
      expect(cancelledExecution.endDate).toBeInstanceOf(Date)
    })

    it('should cancel in-progress execution', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()
      const cancelledExecution = startedExecution.cancel()

      expect(cancelledExecution.status).toBe(ExecutionStatus.CANCELLED)
    })

    it('should cancel paused execution', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()
      const pausedExecution = startedExecution.pause()
      const cancelledExecution = pausedExecution.cancel()

      expect(cancelledExecution.status).toBe(ExecutionStatus.CANCELLED)
    })

    it('should throw error when cancelling completed execution', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()
      const completedExecution = startedExecution.complete()

      expect(() => {
        completedExecution.cancel()
      }).toThrow(InvalidExecutionStatusTransitionException)
    })

    it('should throw error when cancelling already cancelled execution', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const cancelledExecution = execution.cancel()

      expect(() => {
        cancelledExecution.cancel()
      }).toThrow(InvalidExecutionStatusTransitionException)
    })
  })

  describe('addTask', () => {
    it('should add task to scheduled execution', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const task = ExecutionTask.create('Replace brake pads', 30)
      const executionWithTask = execution.addTask(task)

      expect(executionWithTask.tasks).toHaveLength(1)
      expect(executionWithTask.tasks[0]).toBe(task)
    })

    it('should add task to in-progress execution', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()
      const task = ExecutionTask.create('Oil change', 20)
      const executionWithTask = startedExecution.addTask(task)

      expect(executionWithTask.tasks).toHaveLength(1)
    })

    it('should add multiple tasks', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const task1 = ExecutionTask.create('Task 1', 30)
      const task2 = ExecutionTask.create('Task 2', 45)

      const exec1 = execution.addTask(task1)
      const exec2 = exec1.addTask(task2)

      expect(exec2.tasks).toHaveLength(2)
      expect(exec2.tasks[0]).toBe(task1)
      expect(exec2.tasks[1]).toBe(task2)
    })

    it('should throw error when adding task to completed execution', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()
      const completedExecution = startedExecution.complete()
      const task = ExecutionTask.create('Task', 30)

      expect(() => {
        completedExecution.addTask(task)
      }).toThrow(`Cannot add task to execution in ${ExecutionStatus.COMPLETED} status`)
    })

    it('should throw error when adding task to cancelled execution', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const cancelledExecution = execution.cancel()
      const task = ExecutionTask.create('Task', 30)

      expect(() => {
        cancelledExecution.addTask(task)
      }).toThrow(`Cannot add task to execution in ${ExecutionStatus.CANCELLED} status`)
    })
  })

  describe('updateTask', () => {
    it('should update existing task', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const task = ExecutionTask.create('Original task', 30)
      const executionWithTask = execution.addTask(task)

      const startedTask = task.start()
      const updatedExecution = executionWithTask.updateTask(task.taskId, startedTask)

      expect(updatedExecution.tasks[0].status).toBe(TaskStatus.IN_PROGRESS)
    })

    it('should throw error when task not found', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const task = ExecutionTask.create('Task', 30)

      expect(() => {
        execution.updateTask('non-existent-id', task)
      }).toThrow('Task with ID non-existent-id not found')
    })
  })

  describe('getTask', () => {
    it('should return task by ID', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const task = ExecutionTask.create('Task', 30)
      const executionWithTask = execution.addTask(task)

      const foundTask = executionWithTask.getTask(task.taskId)

      expect(foundTask).toBe(task)
    })

    it('should return undefined when task not found', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)

      const foundTask = execution.getTask('non-existent-id')

      expect(foundTask).toBeUndefined()
    })
  })

  describe('isInFinalState', () => {
    it('should return false for SCHEDULED status', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)

      expect(execution.isInFinalState()).toBe(false)
    })

    it('should return false for IN_PROGRESS status', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()

      expect(startedExecution.isInFinalState()).toBe(false)
    })

    it('should return false for PAUSED status', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()
      const pausedExecution = startedExecution.pause()

      expect(pausedExecution.isInFinalState()).toBe(false)
    })

    it('should return true for COMPLETED status', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()
      const completedExecution = startedExecution.complete()

      expect(completedExecution.isInFinalState()).toBe(true)
    })

    it('should return true for INVOICED status', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()
      const completedExecution = startedExecution.complete()
      const invoicedExecution = completedExecution.markInvoiced()

      expect(invoicedExecution.isInFinalState()).toBe(true)
    })

    it('should return true for CANCELLED status', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const cancelledExecution = execution.cancel()

      expect(cancelledExecution.isInFinalState()).toBe(true)
    })
  })

  describe('canBeModified', () => {
    it('should return true for SCHEDULED status', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)

      expect(execution.canBeModified()).toBe(true)
    })

    it('should return true for IN_PROGRESS status', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()

      expect(startedExecution.canBeModified()).toBe(true)
    })

    it('should return true for PAUSED status', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()
      const pausedExecution = startedExecution.pause()

      expect(pausedExecution.canBeModified()).toBe(true)
    })

    it('should return false for COMPLETED status', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()
      const completedExecution = startedExecution.complete()

      expect(completedExecution.canBeModified()).toBe(false)
    })

    it('should return false for INVOICED status', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()
      const completedExecution = startedExecution.complete()
      const invoicedExecution = completedExecution.markInvoiced()

      expect(invoicedExecution.canBeModified()).toBe(false)
    })

    it('should return false for CANCELLED status', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const cancelledExecution = execution.cancel()

      expect(cancelledExecution.canBeModified()).toBe(false)
    })
  })

  describe('status transitions - valid', () => {
    it('should allow transition from SCHEDULED to IN_PROGRESS', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)

      expect(() => execution.start()).not.toThrow()
      expect(execution.start().status).toBe(ExecutionStatus.IN_PROGRESS)
    })

    it('should allow transition from SCHEDULED to CANCELLED', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)

      expect(() => execution.cancel()).not.toThrow()
      expect(execution.cancel().status).toBe(ExecutionStatus.CANCELLED)
    })

    it('should allow transition from IN_PROGRESS to PAUSED', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()

      expect(() => startedExecution.pause()).not.toThrow()
      expect(startedExecution.pause().status).toBe(ExecutionStatus.PAUSED)
    })

    it('should allow transition from IN_PROGRESS to COMPLETED', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()

      expect(() => startedExecution.complete()).not.toThrow()
      expect(startedExecution.complete().status).toBe(ExecutionStatus.COMPLETED)
    })

    it('should allow transition from IN_PROGRESS to CANCELLED', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()

      expect(() => startedExecution.cancel()).not.toThrow()
      expect(startedExecution.cancel().status).toBe(ExecutionStatus.CANCELLED)
    })

    it('should allow transition from PAUSED to IN_PROGRESS', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()
      const pausedExecution = startedExecution.pause()

      expect(() => pausedExecution.resume()).not.toThrow()
      expect(pausedExecution.resume().status).toBe(ExecutionStatus.IN_PROGRESS)
    })

    it('should allow transition from PAUSED to CANCELLED', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()
      const pausedExecution = startedExecution.pause()

      expect(() => pausedExecution.cancel()).not.toThrow()
      expect(pausedExecution.cancel().status).toBe(ExecutionStatus.CANCELLED)
    })

    it('should allow transition from COMPLETED to INVOICED', () => {
      const execution = Execution.create(serviceOrderId, budgetId, estimatedDuration)
      const startedExecution = execution.start()
      const completedExecution = startedExecution.complete()

      expect(() => completedExecution.markInvoiced()).not.toThrow()
      expect(completedExecution.markInvoiced().status).toBe(ExecutionStatus.INVOICED)
    })
  })
})
