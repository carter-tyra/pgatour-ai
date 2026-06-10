"use client";

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acknowledgeTrackerAlerts,
  createModelBackedTrackerBet,
  createTrackerBet,
  createTrackerWatchlist,
  deleteTrackerBet,
  deleteTrackerWatchlist,
  fetchTrackerAlertPreferences,
  fetchTrackerAlerts,
  fetchTrackerSnapshot,
  generateModelEdgeTrackerAlerts,
  type TrackerAlertsParams,
  type TrackerSnapshotParams,
  updateTrackerAlertPreferences,
  updateTrackerBet,
  updateTrackerWatchlist,
  upsertModelBackedTrackerWatchlist,
} from "./api-client";
import { trackerKeys } from "./query-keys";

export function trackerSnapshotQueryOptions(params?: TrackerSnapshotParams) {
  return queryOptions({
    queryFn: () => fetchTrackerSnapshot(params),
    queryKey: trackerKeys.snapshot(params),
    staleTime: 30_000,
  });
}

export function useTrackerSnapshotQuery(params?: TrackerSnapshotParams) {
  return useQuery(trackerSnapshotQueryOptions(params));
}

export function trackerAlertsQueryOptions(params?: TrackerAlertsParams) {
  return queryOptions({
    queryFn: () => fetchTrackerAlerts(params),
    queryKey: trackerKeys.alerts(params),
    staleTime: 15_000,
  });
}

export function useTrackerAlertsQuery(params?: TrackerAlertsParams) {
  return useQuery(trackerAlertsQueryOptions(params));
}

export function trackerAlertPreferencesQueryOptions() {
  return queryOptions({
    queryFn: fetchTrackerAlertPreferences,
    queryKey: trackerKeys.alertPreferences(),
    staleTime: 60_000,
  });
}

export function useTrackerAlertPreferencesQuery() {
  return useQuery(trackerAlertPreferencesQueryOptions());
}

function useInvalidateTrackerQueries() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: trackerKeys.all });
}

export function useCreateTrackerBetMutation() {
  const invalidateTrackerQueries = useInvalidateTrackerQueries();

  return useMutation({
    mutationFn: createTrackerBet,
    onSuccess: invalidateTrackerQueries,
  });
}

export function useCreateModelBackedTrackerBetMutation() {
  const invalidateTrackerQueries = useInvalidateTrackerQueries();

  return useMutation({
    mutationFn: createModelBackedTrackerBet,
    onSuccess: invalidateTrackerQueries,
  });
}

export function useUpdateTrackerBetMutation() {
  const invalidateTrackerQueries = useInvalidateTrackerQueries();

  return useMutation({
    mutationFn: updateTrackerBet,
    onSuccess: invalidateTrackerQueries,
  });
}

export function useDeleteTrackerBetMutation() {
  const invalidateTrackerQueries = useInvalidateTrackerQueries();

  return useMutation({
    mutationFn: deleteTrackerBet,
    onSuccess: invalidateTrackerQueries,
  });
}

export function useCreateTrackerWatchlistMutation() {
  const invalidateTrackerQueries = useInvalidateTrackerQueries();

  return useMutation({
    mutationFn: createTrackerWatchlist,
    onSuccess: invalidateTrackerQueries,
  });
}

export function useUpsertModelBackedTrackerWatchlistMutation() {
  const invalidateTrackerQueries = useInvalidateTrackerQueries();

  return useMutation({
    mutationFn: upsertModelBackedTrackerWatchlist,
    onSuccess: invalidateTrackerQueries,
  });
}

export function useGenerateModelEdgeTrackerAlertsMutation() {
  const invalidateTrackerQueries = useInvalidateTrackerQueries();

  return useMutation({
    mutationFn: generateModelEdgeTrackerAlerts,
    onSuccess: invalidateTrackerQueries,
  });
}

export function useAcknowledgeTrackerAlertsMutation() {
  const invalidateTrackerQueries = useInvalidateTrackerQueries();

  return useMutation({
    mutationFn: acknowledgeTrackerAlerts,
    onSuccess: invalidateTrackerQueries,
  });
}

export function useUpdateTrackerAlertPreferencesMutation() {
  const invalidateTrackerQueries = useInvalidateTrackerQueries();

  return useMutation({
    mutationFn: updateTrackerAlertPreferences,
    onSuccess: invalidateTrackerQueries,
  });
}

export function useUpdateTrackerWatchlistMutation() {
  const invalidateTrackerQueries = useInvalidateTrackerQueries();

  return useMutation({
    mutationFn: updateTrackerWatchlist,
    onSuccess: invalidateTrackerQueries,
  });
}

export function useDeleteTrackerWatchlistMutation() {
  const invalidateTrackerQueries = useInvalidateTrackerQueries();

  return useMutation({
    mutationFn: deleteTrackerWatchlist,
    onSuccess: invalidateTrackerQueries,
  });
}
