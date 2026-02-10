import { StartExecutionUseCase } from './start-execution.use-case'
import { Execution } from '@domain/executions/entities'
import { IExecutionRepository } from '@domain/executions/repositories'
import { IEventPublisher } from '@application/events/interfaces/event-publisher.interface'
import { NotFoundException } from '@nestjs/common'
import { ExecutionStatus } from '@shared/value-objects'
import { InvalidExecutionStatusTransitionException } from '@domain/executions/exceptions'

describe('StartExecutionUseCase', () => {
  let useCase: StartExecutionUseCase
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

    useCase = new StartExecutionUseCase(executionRepository, eventPublisher)
  })

  describe('execute', () => {
    it('should start scheduled execution successfully', async () => {
      const executionId = 'exec-123'
      const scheduledExecution = new Execution(
        executionId,
        'order-123',
        'budget-456',
        'tech-789',
        ExecutionStatus.SCHEDULED,
        new Date(),
        undefined,
        undefined,
        120,
        undefined,
        [],
        undefined,
        new Date(),
        new Date(),
      )

      const startedExecution = new Execution(
        executionId,
        'order-123',
        'budget-456',
        'tech-789',
        ExecutionStatus.IN_PROGRESS,
        scheduledExecution.scheduledDate,
        new Date(),
        undefined,
        120,
        undefined,
        [],
        undefined,
        scheduledExecution.createdAt,
        new Date(),
      )

      executionRepository.findById.mockResolvedValue(scheduledExecution)
      executionRepository.update.mockResolvedValue(startedExecution)

      const result = await useCase.execute(executionId)

      expect(result).toEqual({
        id: executionId,
        serviceOrderId: 'order-123',
        budgetId: 'budget-456',
        technicianId: 'tech-789',
        status: ExecutionStatus.IN_PROGRESS,
        scheduledDate: scheduledExecution.scheduledDate,
        startDate: expect.any(Date),
        endDate: undefined,
        estimatedDuration: 120,
        actualDuration: undefined,
        tasks: [],
        notes: undefined,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      })

      expect(executionRepository.findById).toHaveBeenCalledWith(executionId)
      expect(executionRepository.update).toHaveBeenCalledWith(expect.any(Execution))
      expect(eventPublisher.publishExecutionStarted).toHaveBeenCalledWith({
        executionId,
        serviceOrderId: 'order-123',
        startDate: expect.any(Date),
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
      expect(eventPublisher.publishExecutionStarted).not.toHaveBeenCalled()
    })

    it('should throw error when starting execution from invalid status', async () => {
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
      expect(eventPublisher.publishExecutionStarted).not.toHaveBeenCalled()
    })

    it('should throw error when starting cancelled execution', async () => {
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
      expect(eventPublisher.publishExecutionStarted).not.toHaveBeenCalled()
    })

    it('should throw error when starting already in-progress execution', async () => {
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

      await expect(useCase.execute(executionId)).rejects.toThrow(
        InvalidExecutionStatusTransitionException,
      )

      expect(executionRepository.update).not.toHaveBeenCalled()
      expect(eventPublisher.publishExecutionStarted).not.toHaveBeenCalled()
    })

    it('should handle repository update errors', async () => {
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
      executionRepository.update.mockRejectedValue(new Error('Database error'))

      await expect(useCase.execute(executionId)).rejects.toThrow('Database error')

      expect(executionRepository.update).toHaveBeenCalled()
      expect(eventPublisher.publishExecutionStarted).not.toHaveBeenCalled()
    })

    it('should start execution even if event publishing fails', async () => {
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

      const startedExecution = new Execution(
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
        scheduledExecution.createdAt,
        new Date(),
      )

      executionRepository.findById.mockResolvedValue(scheduledExecution)
      executionRepository.update.mockResolvedValue(startedExecution)
      eventPublisher.publishExecutionStarted.mockRejectedValue(
        new Error('Event bus unavailable'),
      )

      await expect(useCase.execute(executionId)).rejects.toThrow('Event bus unavailable')

      expect(executionRepository.update).toHaveBeenCalled()
    })

    it('should preserve execution properties when starting', async () => {
      const executionId = 'exec-123'
      const scheduledDate = new Date('2025-12-31')
      const scheduledExecution = new Execution(
        executionId,
        'order-123',
        'budget-456',
        'tech-789',
        ExecutionStatus.SCHEDULED,
        scheduledDate,
        undefined,
        undefined,
        120,
        undefined,
        [],
        'Important notes',
        new Date(),
        new Date(),
      )

      const startedExecution = new Execution(
        executionId,
        'order-123',
        'budget-456',
        'tech-789',
        ExecutionStatus.IN_PROGRESS,
        scheduledDate,
        new Date(),
        undefined,
        120,
        undefined,
        [],
        'Important notes',
        scheduledExecution.createdAt,
        new Date(),
      )

      executionRepository.findById.mockResolvedValue(scheduledExecution)
      executionRepository.update.mockResolvedValue(startedExecution)

      const result = await useCase.execute(executionId)

      expect(result.scheduledDate).toEqual(scheduledDate)
      expect(result.technicianId).toBe('tech-789')
      expect(result.notes).toBe('Important notes')
      expect(result.estimatedDuration).toBe(120)
    })
  })
})
