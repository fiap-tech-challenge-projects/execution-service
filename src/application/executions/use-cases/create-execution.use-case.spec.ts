import { CreateExecutionUseCase } from './create-execution.use-case'
import { Execution } from '@domain/executions/entities'
import { IExecutionRepository } from '@domain/executions/repositories'
import { IEventPublisher } from '@application/events/interfaces/event-publisher.interface'
import { CreateExecutionDto } from '../dtos'
import { ExecutionStatus } from '@shared/value-objects'

describe('CreateExecutionUseCase', () => {
  let useCase: CreateExecutionUseCase
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

    useCase = new CreateExecutionUseCase(executionRepository, eventPublisher)
  })

  describe('execute', () => {
    it('should create execution successfully', async () => {
      const dto: CreateExecutionDto = {
        serviceOrderId: 'order-123',
        budgetId: 'budget-456',
        estimatedDuration: 120,
      }

      const createdExecution = new Execution(
        'exec-789',
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

      executionRepository.findByServiceOrderId.mockResolvedValue(null)
      executionRepository.findByBudgetId.mockResolvedValue(null)
      executionRepository.create.mockResolvedValue(createdExecution)

      const result = await useCase.execute(dto)

      expect(result).toEqual({
        id: 'exec-789',
        serviceOrderId: 'order-123',
        budgetId: 'budget-456',
        technicianId: undefined,
        status: ExecutionStatus.SCHEDULED,
        scheduledDate: undefined,
        startDate: undefined,
        endDate: undefined,
        estimatedDuration: 120,
        actualDuration: undefined,
        tasks: [],
        notes: undefined,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      })

      expect(executionRepository.findByServiceOrderId).toHaveBeenCalledWith('order-123')
      expect(executionRepository.findByBudgetId).toHaveBeenCalledWith('budget-456')
      expect(executionRepository.create).toHaveBeenCalledWith(expect.any(Execution))
      expect(eventPublisher.publishExecutionScheduled).toHaveBeenCalledWith({
        executionId: 'exec-789',
        serviceOrderId: 'order-123',
        budgetId: 'budget-456',
        scheduledDate: undefined,
      })
    })

    it('should create execution with all optional fields', async () => {
      const scheduledDate = new Date('2025-12-31')
      const dto: CreateExecutionDto = {
        serviceOrderId: 'order-123',
        budgetId: 'budget-456',
        estimatedDuration: 120,
        scheduledDate,
        technicianId: 'tech-789',
        notes: 'Important execution',
      }

      const createdExecution = new Execution(
        'exec-789',
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
        'Important execution',
        new Date(),
        new Date(),
      )

      executionRepository.findByServiceOrderId.mockResolvedValue(null)
      executionRepository.findByBudgetId.mockResolvedValue(null)
      executionRepository.create.mockResolvedValue(createdExecution)

      const result = await useCase.execute(dto)

      expect(result.technicianId).toBe('tech-789')
      expect(result.scheduledDate).toEqual(scheduledDate)
      expect(result.notes).toBe('Important execution')
      expect(eventPublisher.publishExecutionScheduled).toHaveBeenCalledWith({
        executionId: 'exec-789',
        serviceOrderId: 'order-123',
        budgetId: 'budget-456',
        scheduledDate,
      })
    })

    it('should throw error when execution already exists for service order', async () => {
      const dto: CreateExecutionDto = {
        serviceOrderId: 'order-123',
        budgetId: 'budget-456',
        estimatedDuration: 120,
      }

      const existingExecution = new Execution(
        'exec-existing',
        'order-123',
        'budget-old',
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

      executionRepository.findByServiceOrderId.mockResolvedValue(existingExecution)

      await expect(useCase.execute(dto)).rejects.toThrow(
        'Execution already exists for service order order-123',
      )

      expect(executionRepository.findByServiceOrderId).toHaveBeenCalledWith('order-123')
      expect(executionRepository.create).not.toHaveBeenCalled()
      expect(eventPublisher.publishExecutionScheduled).not.toHaveBeenCalled()
    })

    it('should throw error when execution already exists for budget', async () => {
      const dto: CreateExecutionDto = {
        serviceOrderId: 'order-123',
        budgetId: 'budget-456',
        estimatedDuration: 120,
      }

      const existingExecution = new Execution(
        'exec-existing',
        'order-old',
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

      executionRepository.findByServiceOrderId.mockResolvedValue(null)
      executionRepository.findByBudgetId.mockResolvedValue(existingExecution)

      await expect(useCase.execute(dto)).rejects.toThrow(
        'Execution already exists for budget budget-456',
      )

      expect(executionRepository.findByServiceOrderId).toHaveBeenCalledWith('order-123')
      expect(executionRepository.findByBudgetId).toHaveBeenCalledWith('budget-456')
      expect(executionRepository.create).not.toHaveBeenCalled()
      expect(eventPublisher.publishExecutionScheduled).not.toHaveBeenCalled()
    })

    it('should validate required fields through entity', async () => {
      const dto: CreateExecutionDto = {
        serviceOrderId: '',
        budgetId: 'budget-456',
        estimatedDuration: 120,
      }

      executionRepository.findByServiceOrderId.mockResolvedValue(null)
      executionRepository.findByBudgetId.mockResolvedValue(null)

      await expect(useCase.execute(dto)).rejects.toThrow('Service Order ID is required')

      expect(executionRepository.create).not.toHaveBeenCalled()
      expect(eventPublisher.publishExecutionScheduled).not.toHaveBeenCalled()
    })

    it('should validate estimated duration through entity', async () => {
      const dto: CreateExecutionDto = {
        serviceOrderId: 'order-123',
        budgetId: 'budget-456',
        estimatedDuration: -10,
      }

      executionRepository.findByServiceOrderId.mockResolvedValue(null)
      executionRepository.findByBudgetId.mockResolvedValue(null)

      await expect(useCase.execute(dto)).rejects.toThrow('Estimated duration must be positive')

      expect(executionRepository.create).not.toHaveBeenCalled()
      expect(eventPublisher.publishExecutionScheduled).not.toHaveBeenCalled()
    })

    it('should handle repository errors', async () => {
      const dto: CreateExecutionDto = {
        serviceOrderId: 'order-123',
        budgetId: 'budget-456',
        estimatedDuration: 120,
      }

      executionRepository.findByServiceOrderId.mockRejectedValue(
        new Error('Database connection failed'),
      )

      await expect(useCase.execute(dto)).rejects.toThrow('Database connection failed')

      expect(executionRepository.create).not.toHaveBeenCalled()
      expect(eventPublisher.publishExecutionScheduled).not.toHaveBeenCalled()
    })

    it('should create execution even if event publishing fails', async () => {
      const dto: CreateExecutionDto = {
        serviceOrderId: 'order-123',
        budgetId: 'budget-456',
        estimatedDuration: 120,
      }

      const createdExecution = new Execution(
        'exec-789',
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

      executionRepository.findByServiceOrderId.mockResolvedValue(null)
      executionRepository.findByBudgetId.mockResolvedValue(null)
      executionRepository.create.mockResolvedValue(createdExecution)
      eventPublisher.publishExecutionScheduled.mockRejectedValue(
        new Error('Event bus unavailable'),
      )

      await expect(useCase.execute(dto)).rejects.toThrow('Event bus unavailable')

      expect(executionRepository.create).toHaveBeenCalled()
    })

    it('should create execution with zero scheduled date offset', async () => {
      const scheduledDate = new Date()
      const dto: CreateExecutionDto = {
        serviceOrderId: 'order-123',
        budgetId: 'budget-456',
        estimatedDuration: 60,
        scheduledDate,
      }

      const createdExecution = new Execution(
        'exec-789',
        'order-123',
        'budget-456',
        undefined,
        ExecutionStatus.SCHEDULED,
        scheduledDate,
        undefined,
        undefined,
        60,
        undefined,
        [],
        undefined,
        new Date(),
        new Date(),
      )

      executionRepository.findByServiceOrderId.mockResolvedValue(null)
      executionRepository.findByBudgetId.mockResolvedValue(null)
      executionRepository.create.mockResolvedValue(createdExecution)

      const result = await useCase.execute(dto)

      expect(result.scheduledDate).toEqual(scheduledDate)
    })
  })
})
