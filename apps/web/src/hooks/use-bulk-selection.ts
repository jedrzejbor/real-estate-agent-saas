'use client';

import * as React from 'react';

export function useBulkSelection(itemIds: string[]) {
  const [storedSelectedIds, setStoredSelectedIds] = React.useState<string[]>(
    [],
  );

  const currentIdSet = React.useMemo(() => new Set(itemIds), [itemIds]);
  const selectedIds = React.useMemo(
    () => storedSelectedIds.filter((itemId) => currentIdSet.has(itemId)),
    [currentIdSet, storedSelectedIds],
  );
  const selectedIdSet = React.useMemo(
    () => new Set(selectedIds),
    [selectedIds],
  );
  const selectedCount = selectedIds.length;
  const allSelected = itemIds.length > 0 && selectedCount === itemIds.length;

  const toggle = React.useCallback(
    (itemId: string) => {
      if (!currentIdSet.has(itemId)) return;

      setStoredSelectedIds((current) =>
        current.includes(itemId)
          ? current.filter((selectedId) => selectedId !== itemId)
          : [...current, itemId],
      );
    },
    [currentIdSet],
  );

  const toggleAll = React.useCallback(() => {
    setStoredSelectedIds(allSelected ? [] : itemIds);
  }, [allSelected, itemIds]);

  const clear = React.useCallback(() => {
    setStoredSelectedIds([]);
  }, []);

  return {
    selectedIds,
    selectedIdSet,
    selectedCount,
    allSelected,
    toggle,
    toggleAll,
    clear,
  };
}
