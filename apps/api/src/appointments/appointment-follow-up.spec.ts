import { AgencyLimitEnforcementService } from '../users';
import { AppointmentStatus, AppointmentType } from '../common/enums';
import { AppointmentsService } from './appointments.service';

const appointment = {
  id: 'appointment-1',
  agentId: 'agent-1',
  title: 'Prezentacja mieszkania',
  type: AppointmentType.VIEWING,
  status: AppointmentStatus.SCHEDULED,
  startTime: new Date('2026-06-24T09:00:00.000Z'),
  endTime: new Date('2026-06-24T10:00:00.000Z'),
};

describe('AppointmentsService follow-up integration', () => {
  it('creates a follow-up when a viewing is marked as completed', async () => {
    const { service, appointmentRepo, tasksService } = createService();
    appointmentRepo.findOne.mockResolvedValue(appointment);
    appointmentRepo.save.mockImplementation(async (item) => item);

    await service.update('appointment-1', 'user-1', {
      status: AppointmentStatus.COMPLETED,
    });

    expect(tasksService.createAppointmentFollowUp).toHaveBeenCalledWith(
      'user-1',
      'appointment-1',
    );
  });

  it('does not create a duplicate follow-up when the appointment was already completed', async () => {
    const { service, appointmentRepo, tasksService } = createService();
    appointmentRepo.findOne.mockResolvedValue({
      ...appointment,
      status: AppointmentStatus.COMPLETED,
    });
    appointmentRepo.save.mockImplementation(async (item) => item);

    await service.update('appointment-1', 'user-1', {
      notes: 'Klient chce ofertę finansowania',
    });

    expect(tasksService.createAppointmentFollowUp).not.toHaveBeenCalled();
  });

  it('creates a manual follow-up through the appointment endpoint service method', async () => {
    const { service, appointmentRepo, tasksService } = createService();
    appointmentRepo.findOne.mockResolvedValue(appointment);
    tasksService.createAppointmentFollowUp.mockResolvedValue({
      id: 'task-1',
    });

    const result = await service.createFollowUp('appointment-1', 'user-1', {
      title: 'Zadzwonić do klienta',
      dueAt: '2026-06-25T10:00:00.000Z',
    });

    expect(tasksService.createAppointmentFollowUp).toHaveBeenCalledWith(
      'user-1',
      'appointment-1',
      {
        title: 'Zadzwonić do klienta',
        description: undefined,
        dueAt: '2026-06-25T10:00:00.000Z',
      },
    );
    expect(result).toEqual({ id: 'task-1' });
  });
});

function createService() {
  const appointmentRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const usersService = {
    resolveAgentForUser: jest.fn().mockResolvedValue({ id: 'agent-1' }),
  };
  const tasksService = {
    createAppointmentFollowUp: jest.fn(),
  };

  const service = new AppointmentsService(
    appointmentRepo as never,
    {} as never,
    usersService as never,
    new AgencyLimitEnforcementService(),
    {} as never,
    tasksService as never,
  );

  return {
    service,
    appointmentRepo,
    usersService,
    tasksService,
  };
}
