'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchReportsAppointments,
  fetchReportsClients,
  fetchReportsFreemiumMetrics,
  fetchReportsListings,
  fetchReportsOverview,
  type AppointmentsReportResponse,
  type ClientsReportResponse,
  type FreemiumMetricsReportResponse,
  type ListingsReportResponse,
  type ReportsFilters,
  type ReportsOverviewResponse,
} from '@/lib/reports';

interface UseReportsOverviewResult {
  data: ReportsOverviewResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useReportsOverview(
  filters: ReportsFilters,
): UseReportsOverviewResult {
  const [data, setData] = useState<ReportsOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchReportsOverview(filters);
      if (requestId === requestIdRef.current) {
        setData(result);
      }
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(
          err instanceof Error ? err.message : 'Nie udało się pobrać raportów',
        );
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, isLoading, error, refresh: load };
}

interface UseReportsListingsResult {
  data: ListingsReportResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useReportsListings(
  filters: ReportsFilters,
): UseReportsListingsResult {
  const [data, setData] = useState<ListingsReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchReportsListings(filters);
      if (requestId === requestIdRef.current) {
        setData(result);
      }
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(
          err instanceof Error
            ? err.message
            : 'Nie udało się pobrać raportu ofert',
        );
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, isLoading, error, refresh: load };
}

interface UseReportsClientsResult {
  data: ClientsReportResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useReportsClients(
  filters: ReportsFilters,
): UseReportsClientsResult {
  const [data, setData] = useState<ClientsReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchReportsClients(filters);
      if (requestId === requestIdRef.current) {
        setData(result);
      }
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(
          err instanceof Error
            ? err.message
            : 'Nie udało się pobrać raportu klientów',
        );
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, isLoading, error, refresh: load };
}

interface UseReportsAppointmentsResult {
  data: AppointmentsReportResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

interface UseReportsAppointmentsOptions {
  enabled?: boolean;
}

export function useReportsAppointments(
  filters: ReportsFilters,
  options: UseReportsAppointmentsOptions = {},
): UseReportsAppointmentsResult {
  const enabled = options.enabled ?? true;
  const [data, setData] = useState<AppointmentsReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!enabled) {
      requestIdRef.current += 1;
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchReportsAppointments(filters);
      if (requestId === requestIdRef.current) {
        setData(result);
      }
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(
          err instanceof Error
            ? err.message
            : 'Nie udało się pobrać raportu spotkań',
        );
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, isLoading, error, refresh: load };
}

interface UseReportsFreemiumMetricsResult {
  data: FreemiumMetricsReportResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useReportsFreemiumMetrics(
  filters: ReportsFilters,
): UseReportsFreemiumMetricsResult {
  const [data, setData] = useState<FreemiumMetricsReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchReportsFreemiumMetrics(filters);
      if (requestId === requestIdRef.current) {
        setData(result);
      }
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(
          err instanceof Error
            ? err.message
            : 'Nie udało się pobrać raportu freemium',
        );
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, isLoading, error, refresh: load };
}
