import { NotFoundException } from '@nestjs/common';
import {
  TaskPriority,
  TaskRelatedEntityType,
  TaskStatus,
  TaskType,
} from '../common/enums';
import { TasksService } from './tasks.service';

const agent = { id: 'agent-1' };
const fixedNow = new Date('2026-06-24T10:00:00.000Z');

describe('TasksService', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(fixedNow);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a scoped task and infers the primary related entity', async () => {
    const { service, taskRepo, appointmentRepo } = createService();
    appointmentRepo.exist.mockResolvedValue(true);
    taskRepo.save.mockImplementation(async (task) => ({
      id: 'task-1',
      createdAt: fixedNow,
      updatedAt: fixedNow,
      ...task,
    }));

    const result = await service.create('user-1', {
      title: '  Zadzwonić po prezentacji  ',
      description: '  Ustalić decyzję klienta  ',
      type: TaskType.FOLLOW_UP,
      priority: TaskPriority.HIGH,
      appointmentId: 'appointment-1',
      dueAt: '2026-06-25T10:00:00.000Z',
    });

    expect(appointmentRepo.exist).toHaveBeenCalledWith({
      where: { id: 'appointment-1', agentId: agent.id },
    });
    expect(taskRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: agent.id,
        title: 'Zadzwonić po prezentacji',
        description: 'Ustalić decyzję klienta',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        type: TaskType.FOLLOW_UP,
        appointmentId: 'appointment-1',
        relatedEntityType: TaskRelatedEntityType.APPOINTMENT,
        relatedEntityId: 'appointment-1',
        dueAt: new Date('2026-06-25T10:00:00.000Z'),
        completedAt: null,
      }),
    );
    expect(result).toMatchObject({
      id: 'task-1',
      agentId: agent.id,
      title: 'Zadzwonić po prezentacji',
    });
  });

  it('does not allow creating a task for an appointment outside agent scope', async () => {
    const { service, appointmentRepo, taskRepo } = createService();
    appointmentRepo.exist.mockResolvedValue(false);

    await expect(
      service.create('user-1', {
        title: 'Follow-up',
        appointmentId: 'foreign-appointment',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  it('lists tasks only for the resolved agent and applies filters', async () => {
    const { service, taskQb } = createService();

    await service.findAll('user-1', {
      status: TaskStatus.TODO,
      type: TaskType.FOLLOW_UP,
      clientId: 'client-1',
      search: 'umowa',
      page: 2,
      limit: 10,
    });

    expect(taskQb.where).toHaveBeenCalledWith('task.agentId = :agentId', {
      agentId: agent.id,
    });
    expect(taskQb.andWhere).toHaveBeenCalledWith('task.status = :status', {
      status: TaskStatus.TODO,
    });
    expect(taskQb.andWhere).toHaveBeenCalledWith('task.type = :type', {
      type: TaskType.FOLLOW_UP,
    });
    expect(taskQb.andWhere).toHaveBeenCalledWith('task.clientId = :clientId', {
      clientId: 'client-1',
    });
    expect(taskQb.skip).toHaveBeenCalledWith(10);
    expect(taskQb.take).toHaveBeenCalledWith(10);
  });

  it('marks a task as done once and preserves completedAt on repeated updates', async () => {
    const existingCompletedAt = new Date('2026-06-23T08:00:00.000Z');
    const { service, taskRepo } = createService();
    taskRepo.findOne.mockResolvedValue({
      id: 'task-1',
      agentId: agent.id,
      title: 'Follow-up',
      status: TaskStatus.TODO,
      completedAt: existingCompletedAt,
    });
    taskRepo.save.mockImplementation(async (task) => task);

    const result = await service.update('task-1', 'user-1', {
      status: TaskStatus.DONE,
    });

    expect(taskRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'task-1', agentId: agent.id },
    });
    expect(result.status).toBe(TaskStatus.DONE);
    expect(result.completedAt).toBe(existingCompletedAt);
  });
});

function createService() {
  const taskQb = createQueryBuilderMock();
  const taskRepo = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => taskQb),
  };
  const appointmentRepo = {
    exist: jest.fn().mockResolvedValue(true),
  };
  const clientRepo = {
    exist: jest.fn().mockResolvedValue(true),
  };
  const listingRepo = {
    exist: jest.fn().mockResolvedValue(true),
  };
  const usersService = {
    resolveAgentForUser: jest.fn().mockResolvedValue(agent),
  };

  const service = new TasksService(
    taskRepo as never,
    appointmentRepo as never,
    clientRepo as never,
    listingRepo as never,
    usersService as never,
  );

  return {
    service,
    taskRepo,
    appointmentRepo,
    clientRepo,
    listingRepo,
    usersService,
    taskQb,
  };
}

function createQueryBuilderMock() {
  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };

  return qb;
}
