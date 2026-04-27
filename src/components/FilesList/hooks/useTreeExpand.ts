import { useCallback, useState } from 'react';

import { PathEntryDirectory } from '@theia/types';

/**
 * Use Tree Expand
 *
 * @param categories
 */
export const useTreeExpand = (categories: PathEntryDirectory[]) => {
  /**
   * Expanded State
   */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  /**
   * Expand All
   */
  const onExpandAll = useCallback(() => {
    setExpanded(
      categories.reduce(
        (acc, { path }) => ({
          ...acc,
          [path]: true,
        }),
        {}
      )
    );
  }, [categories]);

  /**
   * Collapse All
   */
  const onCollapseAll = useCallback(() => {
    setExpanded({});
  }, []);

  /**
   * Set Item Expanded
   */
  const onSetItemExpanded = useCallback((item: PathEntryDirectory, isExpanded: boolean) => {
    setExpanded((expanded) => ({
      ...expanded,
      [item.path]: isExpanded,
    }));
  }, []);

  /**
   * Is Item Expanded
   */
  const isItemExpanded = useCallback((item: PathEntryDirectory) => expanded[item.path] || false, [expanded]);

  return {
    onExpandAll,
    onCollapseAll,
    onSetItemExpanded,
    isItemExpanded,
  };
};
