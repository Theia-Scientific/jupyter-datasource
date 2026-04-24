import { Sort } from './types';

/**
 * Sort Options
 */
export const SORT_OPTIONS = [
  {
    label: "Name: A to Z",
    value: Sort.NAME_ASC,
  },
  {
    label: "Name: Z to A",
    value: Sort.NAME_DESC,
  },
  {
    label: "Modified: oldest",
    value: Sort.LAST_MODIFIED_ASC,
  },
  {
    label: "Modified: newest",
    value: Sort.LAST_MODIFIED_DESC,
  },
  {
    label: "Size: smallest",
    value: Sort.SIZE_ASC,
  },
  {
    label: "Size: biggest",
    value: Sort.SIZE_DESC,
  },
];
