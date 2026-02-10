import { ExecutionTask } from './execution-task.entity'
import { TaskStatus } from '@shared/value-objects'

describe('ExecutionTask Entity', () => {
  const description = 'Replace oil filter'
  const estimatedDuration = 30 // 30 minutes
  const assignedTo = 'tech-123'

  describe('create', () => {
    it('should create task with PENDING status', () => {
      const task = ExecutionTask.create(description, estimatedDuration)

      expect(task).toBeInstanceOf(ExecutionTask)
      expect(task.description).toBe(description)
      expect(task.estimatedDuration).toBe(estimatedDuration)
      expect(task.status).toBe(TaskStatus.PENDING)
      expect(task.actualDuration).toBeUndefined()
      expect(task.completedAt).toBeUndefined()
      expect(task.assignedTo).toBeUndefined()
    })

    it('should create task with assigned technician', () => {
      const task = ExecutionTask.create(description, estimatedDuration, assignedTo)

      expect(task.assignedTo).toBe(assignedTo)
    })

    it('should generate unique task ID', () => {
      const task1 = ExecutionTask.create(description, estimatedDuration)
      const task2 = ExecutionTask.create(description, estimatedDuration)

      expect(task1.taskId).not.toBe(task2.taskId)
      expect(task1.taskId).toBeTruthy()
      expect(task2.taskId).toBeTruthy()
    })

    it('should throw error when description is empty', () => {
      expect(() => {
        new ExecutionTask('task-123', '', TaskStatus.PENDING, estimatedDuration)
      }).toThrow('Task description cannot be empty')
    })

    it('should throw error when description is whitespace', () => {
      expect(() => {
        new ExecutionTask('task-123', '   ', TaskStatus.PENDING, estimatedDuration)
      }).toThrow('Task description cannot be empty')
    })

    it('should throw error when estimated duration is zero', () => {
      expect(() => {
        new ExecutionTask('task-123', description, TaskStatus.PENDING, 0)
      }).toThrow('Estimated duration must be positive')
    })

    it('should throw error when estimated duration is negative', () => {
      expect(() => {
        new ExecutionTask('task-123', description, TaskStatus.PENDING, -10)
      }).toThrow('Estimated duration must be positive')
    })
  })

  describe('start', () => {
    it('should start pending task', () => {
      const task = ExecutionTask.create(description, estimatedDuration)
      const startedTask = task.start()

      expect(startedTask.status).toBe(TaskStatus.IN_PROGRESS)
      expect(startedTask.taskId).toBe(task.taskId)
      expect(startedTask.description).toBe(task.description)
      expect(startedTask.estimatedDuration).toBe(task.estimatedDuration)
    })

    it('should throw error when starting in-progress task', () => {
      const task = ExecutionTask.create(description, estimatedDuration)
      const startedTask = task.start()

      expect(() => {
        startedTask.start()
      }).toThrow(`Cannot start task in ${TaskStatus.IN_PROGRESS} status`)
    })

    it('should throw error when starting completed task', () => {
      const task = ExecutionTask.create(description, estimatedDuration)
      const startedTask = task.start()
      const completedTask = startedTask.complete(estimatedDuration)

      expect(() => {
        completedTask.start()
      }).toThrow(`Cannot start task in ${TaskStatus.COMPLETED} status`)
    })

    it('should throw error when starting cancelled task', () => {
      const task = ExecutionTask.create(description, estimatedDuration)
      const cancelledTask = task.cancel()

      expect(() => {
        cancelledTask.start()
      }).toThrow(`Cannot start task in ${TaskStatus.CANCELLED} status`)
    })
  })

  describe('complete', () => {
    it('should complete in-progress task', () => {
      const task = ExecutionTask.create(description, estimatedDuration)
      const startedTask = task.start()
      const actualDuration = 35
      const completedTask = startedTask.complete(actualDuration)

      expect(completedTask.status).toBe(TaskStatus.COMPLETED)
      expect(completedTask.actualDuration).toBe(actualDuration)
      expect(completedTask.completedAt).toBeInstanceOf(Date)
    })

    it('should allow actual duration different from estimated', () => {
      const task = ExecutionTask.create(description, 30)
      const startedTask = task.start()
      const completedTask = startedTask.complete(45)

      expect(completedTask.actualDuration).toBe(45)
    })

    it('should throw error when completing pending task', () => {
      const task = ExecutionTask.create(description, estimatedDuration)

      expect(() => {
        task.complete(estimatedDuration)
      }).toThrow(`Cannot complete task in ${TaskStatus.PENDING} status`)
    })

    it('should throw error when completing already completed task', () => {
      const task = ExecutionTask.create(description, estimatedDuration)
      const startedTask = task.start()
      const completedTask = startedTask.complete(estimatedDuration)

      expect(() => {
        completedTask.complete(estimatedDuration)
      }).toThrow(`Cannot complete task in ${TaskStatus.COMPLETED} status`)
    })

    it('should throw error when completing cancelled task', () => {
      const task = ExecutionTask.create(description, estimatedDuration)
      const startedTask = task.start()
      const cancelledTask = startedTask.cancel()

      expect(() => {
        cancelledTask.complete(estimatedDuration)
      }).toThrow(`Cannot complete task in ${TaskStatus.CANCELLED} status`)
    })

    it('should throw error when actual duration is zero', () => {
      const task = ExecutionTask.create(description, estimatedDuration)
      const startedTask = task.start()

      expect(() => {
        startedTask.complete(0)
      }).toThrow('Actual duration must be positive')
    })

    it('should throw error when actual duration is negative', () => {
      const task = ExecutionTask.create(description, estimatedDuration)
      const startedTask = task.start()

      expect(() => {
        startedTask.complete(-10)
      }).toThrow('Actual duration must be positive')
    })
  })

  describe('cancel', () => {
    it('should cancel pending task', () => {
      const task = ExecutionTask.create(description, estimatedDuration)
      const cancelledTask = task.cancel()

      expect(cancelledTask.status).toBe(TaskStatus.CANCELLED)
      expect(cancelledTask.taskId).toBe(task.taskId)
    })

    it('should cancel in-progress task', () => {
      const task = ExecutionTask.create(description, estimatedDuration)
      const startedTask = task.start()
      const cancelledTask = startedTask.cancel()

      expect(cancelledTask.status).toBe(TaskStatus.CANCELLED)
    })

    it('should throw error when cancelling completed task', () => {
      const task = ExecutionTask.create(description, estimatedDuration)
      const startedTask = task.start()
      const completedTask = startedTask.complete(estimatedDuration)

      expect(() => {
        completedTask.cancel()
      }).toThrow('Cannot cancel completed task')
    })

    it('should allow cancelling already cancelled task', () => {
      const task = ExecutionTask.create(description, estimatedDuration)
      const cancelledTask = task.cancel()

      // ExecutionTask.cancel() doesn't throw for already cancelled tasks
      const cancelledAgain = cancelledTask.cancel()
      expect(cancelledAgain.status).toBe(TaskStatus.CANCELLED)
    })
  })

  describe('status transitions - valid', () => {
    it('should allow transition from PENDING to IN_PROGRESS', () => {
      const task = ExecutionTask.create(description, estimatedDuration)

      expect(() => task.start()).not.toThrow()
      expect(task.start().status).toBe(TaskStatus.IN_PROGRESS)
    })

    it('should allow transition from PENDING to CANCELLED', () => {
      const task = ExecutionTask.create(description, estimatedDuration)

      expect(() => task.cancel()).not.toThrow()
      expect(task.cancel().status).toBe(TaskStatus.CANCELLED)
    })

    it('should allow transition from IN_PROGRESS to COMPLETED', () => {
      const task = ExecutionTask.create(description, estimatedDuration)
      const startedTask = task.start()

      expect(() => startedTask.complete(estimatedDuration)).not.toThrow()
      expect(startedTask.complete(estimatedDuration).status).toBe(TaskStatus.COMPLETED)
    })

    it('should allow transition from IN_PROGRESS to CANCELLED', () => {
      const task = ExecutionTask.create(description, estimatedDuration)
      const startedTask = task.start()

      expect(() => startedTask.cancel()).not.toThrow()
      expect(startedTask.cancel().status).toBe(TaskStatus.CANCELLED)
    })
  })

  describe('immutability', () => {
    it('should return new instance when starting task', () => {
      const task = ExecutionTask.create(description, estimatedDuration)
      const startedTask = task.start()

      expect(startedTask).not.toBe(task)
      expect(task.status).toBe(TaskStatus.PENDING)
      expect(startedTask.status).toBe(TaskStatus.IN_PROGRESS)
    })

    it('should return new instance when completing task', () => {
      const task = ExecutionTask.create(description, estimatedDuration)
      const startedTask = task.start()
      const completedTask = startedTask.complete(estimatedDuration)

      expect(completedTask).not.toBe(startedTask)
      expect(startedTask.status).toBe(TaskStatus.IN_PROGRESS)
      expect(completedTask.status).toBe(TaskStatus.COMPLETED)
    })

    it('should return new instance when cancelling task', () => {
      const task = ExecutionTask.create(description, estimatedDuration)
      const cancelledTask = task.cancel()

      expect(cancelledTask).not.toBe(task)
      expect(task.status).toBe(TaskStatus.PENDING)
      expect(cancelledTask.status).toBe(TaskStatus.CANCELLED)
    })
  })
})
