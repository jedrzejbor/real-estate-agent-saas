import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type MonitoredFlow =
  | 'listing_publish'
  | 'listing_unpublish'
  | 'public_lead_listing'
  | 'public_lead_profile'
  | 'public_submission_create'
  | 'public_submission_upload'
  | 'public_submission_resend'
  | 'public_submission_verify'
  | 'public_submission_claim'
  | 'public_analytics_event';

type MonitoringStatus = 'success' | 'failure' | 'warning';

type MonitoringContext = Record<string, unknown>;

interface CounterState {
  count: number;
  windowStartedAt: number;
  lastAlertedAt: number | null;
}

interface MonitorOptions<TResult> {
  flow: MonitoredFlow;
  failureEvent: string;
  context?: MonitoringContext;
  successEvent?: string;
  successContext?: (result: TResult) => MonitoringContext;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly counters = new Map<string, CounterState>();

  constructor(private readonly configService: ConfigService) {}

  async monitor<TResult>(
    options: MonitorOptions<TResult>,
    action: () => Promise<TResult>,
  ): Promise<TResult> {
    try {
      const result = await action();

      if (options.successEvent) {
        this.recordSuccess(options.flow, options.successEvent, {
          ...options.context,
          ...options.successContext?.(result),
        });
      }

      return result;
    } catch (error) {
      this.recordFailure(
        options.flow,
        options.failureEvent,
        error,
        options.context,
      );
      throw error;
    }
  }

  recordSuccess(
    flow: MonitoredFlow,
    event: string,
    context?: MonitoringContext,
  ): void {
    this.record('success', flow, event, context);
  }

  recordWarning(
    flow: MonitoredFlow,
    event: string,
    context?: MonitoringContext,
  ): void {
    this.record('warning', flow, event, context);
  }

  recordFailure(
    flow: MonitoredFlow,
    event: string,
    error: unknown,
    context?: MonitoringContext,
  ): void {
    this.record('failure', flow, event, {
      ...context,
      error: this.getErrorContext(error),
    });
  }

  private record(
    status: MonitoringStatus,
    flow: MonitoredFlow,
    event: string,
    context?: MonitoringContext,
  ): void {
    const payload = {
      flow,
      status,
      event,
      timestamp: new Date().toISOString(),
      context: sanitizeContext(context),
    };
    const line = JSON.stringify(payload);

    if (status === 'failure') {
      this.logger.error(line);
    } else if (status === 'warning') {
      this.logger.warn(line);
    } else {
      this.logger.log(line);
    }

    if (status !== 'success') {
      this.updateCounter(status, flow, event);
    }
  }

  private updateCounter(
    status: Extract<MonitoringStatus, 'failure' | 'warning'>,
    flow: MonitoredFlow,
    event: string,
  ): void {
    const windowMs = this.getNumber('MONITORING_WINDOW_MS', 5 * 60 * 1000);
    const threshold = this.getNumber(
      status === 'failure'
        ? 'MONITORING_FAILURE_ALERT_THRESHOLD'
        : 'MONITORING_WARNING_ALERT_THRESHOLD',
      status === 'failure' ? 5 : 10,
    );
    const now = Date.now();
    const key = `${flow}:${status}:${event}`;
    const current = this.counters.get(key);
    const counter =
      current && now - current.windowStartedAt <= windowMs
        ? current
        : { count: 0, windowStartedAt: now, lastAlertedAt: null };

    counter.count += 1;
    this.counters.set(key, counter);

    if (
      counter.count < threshold ||
      counter.lastAlertedAt === counter.windowStartedAt
    ) {
      return;
    }

    counter.lastAlertedAt = counter.windowStartedAt;
    this.logger.warn(
      JSON.stringify({
        alert: 'freemium_flow_threshold',
        flow,
        status,
        event,
        count: counter.count,
        threshold,
        windowMs,
        windowStartedAt: new Date(counter.windowStartedAt).toISOString(),
        timestamp: new Date(now).toISOString(),
      }),
    );
  }

  private getNumber(name: string, fallback: number): number {
    const value = Number(this.configService.get<string | number>(name));

    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private getErrorContext(error: unknown): MonitoringContext {
    if (error instanceof HttpException) {
      return {
        name: error.name,
        message: error.message,
        statusCode: error.getStatus(),
      };
    }

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
      };
    }

    return { name: 'UnknownError' };
  }
}

function sanitizeContext(context?: MonitoringContext): MonitoringContext {
  if (!context) {
    return {};
  }

  return Object.entries(context).reduce<MonitoringContext>(
    (sanitized, [key, value]) => {
      if (isSensitiveKey(key) || value === undefined || value === null) {
        return sanitized;
      }

      if (Array.isArray(value)) {
        sanitized[key] = value
          .filter((item) =>
            ['string', 'number', 'boolean'].includes(typeof item),
          )
          .slice(0, 10);
        return sanitized;
      }

      if (typeof value === 'object') {
        sanitized[key] = sanitizeContext(value as MonitoringContext);
        return sanitized;
      }

      if (['string', 'number', 'boolean'].includes(typeof value)) {
        sanitized[key] = value;
      }

      return sanitized;
    },
    {},
  );
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();

  return [
    'email',
    'phone',
    'fullname',
    'firstname',
    'lastname',
    'message',
    'ownername',
    'token',
    'claimtoken',
    'verificationtoken',
    'iphash',
    'useragent',
  ].some((sensitive) => normalized.includes(sensitive));
}
