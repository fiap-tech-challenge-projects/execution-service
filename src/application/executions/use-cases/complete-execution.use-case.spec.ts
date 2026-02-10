import { CompleteExecutionUseCase } from './complete-execution.use-case'
import { Execution } from '@domain/executions/entities'
import { IExecutionRepository } from '@domain/executions/repositories'
import { IEventPublisher } from '@application/events/interfaces/event-publisher.interface'
import { NotFoundException } from '@nestjs/common'
import { ExecutionStatus } from '@shared/value-objects'
import { InvalidExecutionStatusTransitionException } from '@domain/executions/exceptions'

describe('CompleteExecutionUseCase', () => {
  let useCase: CompleteExecutionUseCase
  let executionRepository: jest.Mocked<IExecutionRepository>
  let eventPublisher: jest.Mocked<IEventPublisher>

  beforeEach(() => {
    executionRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByServiceOrderId: jest.fn(),
      findByBudgetId: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByStatus: jest.fn(),
      findByTechnicianId: jest.fn(),
    } as jest.Mocked<IExecutionRepository>

    eventPublisher = {
      publishExecutionScheduled: jest.fn(),
      publishExecutionStarted: jest.fn(),
      publishExecutionPaused: jest.fn(),
      publishExecutionResumed: jest.fn(),
      publishExecutionCompleted: jest.fn(),
      publishExecutionCancelled: jest.fn(),
      publishTaskCompleted: jest.fn(),
    } as jest.Mocked<IEventPublisher>

    useCase = new CompleteExecutionUseCase(executionRepository, eventPublisher)
  })

  describe('execute', () => {
    it('should complete in-progress execution successfully', async () => {
      const executionId = 'exec-123'
      const startDate = new Date(Date.now() - 7200000) // 2 hours ago
      const inProgressExecution = new Execution(
        executionId,
        'order-123',
        'budget-456',
        'tech-789',
        ExecutionStatus.IN_PROGRESS,
        undefined,
        startDate,
        undefined,
        120,
        undefined,
        [],
        undefined,
        new Date(),
        new Date(),
      )

      const completedExecution = new Execution(
        executionId,
        'order-123',
        'budget-456',
        'tech-789',
        ExecutionStatus.COMPLETED,
        undefined,
        startDate,
        new Date(),
        120,
        120, // actual duration calculated
        [],
        undefined,
        inProgressExecution.createdAt,
        new Date(),
      )

      executionRepository.findById.mockResolvedValue(inProgressExecution)
      executionRepository.update.mockResolvedValue(completedExecution)

      const result = await useCase.execute(executionId)

      expect(result).toEqual({
        id: executionId,
        serviceOrderId: 'order-123',
        budgetId: 'budget-456',
        technicianId: 'tech-789',
        status: ExecutionStatus.COMPLETED,
        scheduledDate: undefined,
        startDate,
        endDate: expect.any(Date),
        estimatedDuration: 120,
        actualDuration: expect.any(Number),
        tasks: [],
        notes: undefined,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      })

      expect(executionRepository.findById).toHaveBeenCalledWith(executionId)
      expect(executionRepository.update).toHaveBeenCalledWith(expect.any(Execution))
      expect(eventPublisher.publishExecutionCompleted).toHaveBeenCalledWith({
        executionId,
        serviceOrderId: 'order-123',
        budgetId: 'budget-456',
        endDate: expect.any(Date),
        actualDuration: expect.any(Number),
      })
    })

    it('should throw NotFoundException when execution does not exist', async () => {
      const executionId = 'non-existent'

      executionRepository.findById.mockResolvedValue(null)

      await expect(useCase.execute(executionId)).rejects.toThrow(NotFoundException)
      await expect(useCase.execute(executionId)).rejects.toThrow(
        `Execution with ID ${executionId} not found`,
      )

      expect(executionRepository.update).not.toHaveBeenCalled()
      expect(eventPublisher.publishExecutionCompleted).not.toHaveBeenCalled()
    })

    it('should throw error when completing execution from invalid status', async () => {
      const executionId = 'exec-123'
      const scheduledExecution = new Execution(
        executionId,
        'order-123',
        'budget-456',
        undefined,
        ExecutionStatus.SCHEDULED,
        undefined,
        undefined,
        undefined,
        120,
        undefined,
        [],
        undefined,
        new Date(),
        new Date(),
      )

      executionRepository.findById.mockResolvedValue(scheduledExecution)

      await expect(useCase.execute(executionId)).rejects.toThrow(
        InvalidExecutionStatusTransitionException,
      )

      expect(executionRepository.update).not.toHaveBeenCalled()
      expect(eventPublisher.publishExecutionCompleted).not.toHaveBeenCalled()
    })

    it('should throw error when completing paused execution', async () => {
      const executionId = 'exec-123'
      const pausedExecution = new Execution(
        executionId,
        'order-123',
        'budget-456',
        undefined,
        ExecutionStatus.PAUSED,
        undefined,
        new Date(),
        undefined,
        120,
        undefined,
        [],
        undefined,
        new Date(),
        new Date(),
      )

      executionRepository.findById.mockResolvedValue(pausedExecution)

      await expect(useCase.execute(executionId)).rejects.toThrow(
        InvalidExecutionStatusTransitionException,
      )

      expect(executionRepository.update).not.toHaveBeenCalled()
      expect(eventPublisher.publishExecutionCompleted).not.toHaveBeenCalled()
    })

    it('should throw error when completing already completed execution', async () => {
      const executionId = 'exec-123'
      const completedExecution = new Execution(
        executionId,
        'order-123',
        'budget-456',
        undefined,
        ExecutionStatus.COMPLETED,
        undefined,
        new Date(),
        new Date(),
        120,
        120,
        [],
        undefined,
        new Date(),
        new Date(),
      )

      executionRepository.findById.mockResolvedValue(completedExecution)

      await expect(useCase.execute(executionId)).rejects.toThrow(
        InvalidExecutionStatusTransitionException,
      )

      expect(executionRepository.update).not.toHaveBeenCalled()
      expect(eventPublisher.publishExecutionCompleted).not.toHaveBeenCalled()
    })

    it('should throw error when completing cancelled execution', async () => {
      const executionId = 'exec-123'
      const cancelledExecution = new Execution(
        executionId,
        'order-123',
        'budget-456',
        undefined,
        ExecutionStatus.CANCELLED,
        undefined,
        undefined,
        new Date(),
        120,
        undefined,
        [],
        undefined,
        new Date(),
        new Date(),
      )

      executionRepository.findById.mockResolvedValue(cancelledExecution)

      await expect(useCase.execute(executionId)).rejects.toThrow(
        InvalidExecutionStatusTransitionException,
      )

      expect(executionRepository.update).not.toHaveBeenCalled()
      expect(eventPublisher.publishExecutionCompleted).not.toHaveBeenCalled()
    })

    it('should calculate actual duration correctly', async () => {
      const executionId = 'exec-123'
      const startDate = new Date(Date.now() - 3600000) // 1 hour ago
      const inProgressExecution = new Execution(
        executionId,
        'order-123',
        'budget-456',
        undefined,
        ExecutionStatus.IN_PROGRESS,
        undefined,
        startDate,
        undefined,
        120,
        undefined,
        [],
        undefined,
        new Date(),
        new Date(),
      )

      const completedExecution = new Execution(
        executionId,
        'order-123',
        'budget-456',
        undefined,
        ExecutionStatus.COMPLETED,
        undefined,
        startDate,
        new Date(),
        120,
        60, // approximately 60 minutes
        [],
        undefined,
        inProgressExecution.createdAt,
        new Date(),
      )

      executionRepository.findById.mockResolvedValue(inProgressExecution)
      executionRepository.update.mockResolvedValue(completedExecution)

      const result = await useCase.execute(executionId)

      expect(result.actualDuration).toBeGreaterThanOrEqual(59)
      expect(result.actualDuration).toBeLessThanOrEqual(61)
    })

    it('should handle repository update errors', async () => {
      const executionId = 'exec-123'
      const inProgressExecution = new Execution(
        executionId,
        'order-123',
        'budget-456',
        undefined,
        ExecutionStatus.IN_PROGRESS,
        undefined,
        new Date(),
        undefined,
        120,
        undefined,
        [],
        undefined,
        new Date(),
        new Date(),
      )

      executionRepository.findById.mockResolvedValue(inProgressExecution)
      executionRepository.update.mockRejectedValue(new Error('Database error'))

      await expect(useCase.execute(executionId)).rejects.toThrow('Database error')

      expect(executionRepository.update).toHaveBeenCalled()
      expect(eventPublisher.publishExecutionCompleted).not.toHaveBeenCalled()
    })

    it('should complete execution even if event publishing fails', async () => {
      const executionId = 'exec-123'
      const inProgressExecution = new Execution(
        executionId,
        'order-123',
        'budget-456',
        undefined,
        ExecutionStatus.IN_PROGRESS,
        undefined,
        new Date(),
        undefined,
        120,
        undefined,
        [],
        undefined,
        new Date(),
        new Date(),
      )

      const completedExecution = new Execution(
        executionId,
        'order-123',
        'budget-456',
        undefined,
        ExecutionStatus.COMPLETED,
        undefined,
        inProgressExecution.startDate,
        new Date(),
        120,
        0,
        [],
        undefined,
        inProgressExecution.createdAt,
        new Date(),
      )

      executionRepository.findById.mockResolvedValue(inProgressExecution)
      executionRepository.update.mockResolvedValue(completedExecution)
      eventPublisher.publishExecutionCompleted.mockRejectedValue(
        new Error('Event bus unavailable'),
      )

      await expect(useCase.execute(executionId)).rejects.toThrow('Event bus unavailable')

      expect(executionRepository.update).toHaveBeenCalled()
    })

    it('should preserve execution properties when completing', async () => {
      const executionId = 'exec-123'
      const scheduledDate = new Date('2025-12-31')
      const startDate = new Date()
      const inProgressExecution = new Execution(
        executionId,
        'order-123',
        'budget-456',
        'tech-789',
        ExecutionStatus.IN_PROGRESS,
        scheduledDate,
        startDate,
        undefined,
        120,
        undefined,
        [],
        'Important execution',
        new Date(),
        new Date(),
      )

      const completedExecution = new Execution(
        executionId,
        'order-123',
        'budget-456',
        'tech-789',
        ExecutionStatus.COMPLETED,
        scheduledDate,
        startDate,
        new Date(),
        120,
        0,
        [],
        'Important execution',
        inProgressExecution.createdAt,
        new Date(),
      )

      executionRepository.findById.mockResolvedValue(inProgressExecution)
      executionRepository.update.mockResolvedValue(completedExecution)

      const result = await useCase.execute(executionId)

      expect(result.scheduledDate).toEqual(scheduledDate)
      expect(result.technicianId).toBe('tech-789')
      expect(result.notes).toBe('Important execution')
      expect(result.estimatedDuration).toBe(120)
      expect(result.startDate).toEqual(startDate)
    })

    it('should set endDate when completing execution', async () => {
      const executionId = 'exec-123'
      const inProgressExecution = new Execution(
        executionId,
        'order-123',
        'budget-456',
        undefined,
        ExecutionStatus.IN_PROGRESS,
        undefined,
        new Date(),
        undefined,
        120,
        undefined,
        [],
        undefined,
        new Date(),
        new Date(),
      )

      const completedExecution = new Execution(
        executionId,
        'order-123',
        'budget-456',
        undefined,
        ExecutionStatus.COMPLETED,
        undefined,
        inProgressExecution.startDate,
        new Date(),
        120,
        0,
        [],
        undefined,
        inProgressExecution.createdAt,
        new Date(),
      )

      executionRepository.findById.mockResolvedValue(inProgressExecution)
      executionRepository.update.mockResolvedValue(completedExecution)

      const result = await useCase.execute(executionId)

      expect(result.endDate).toBeInstanceOf(Date)
      expect(result.endDate).toBeTruthy()
    })
  })
})
