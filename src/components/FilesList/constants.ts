import { t } from 'i18next';

import { Sort } from './types';

/**
 * Sort Options
 */
export const SORT_OPTIONS = [
  {
    label: t('filesList.sortOptions.nameAsc'),
    value: Sort.NAME_ASC,
  },
  {
    label: t('filesList.sortOptions.nameDesc'),
    value: Sort.NAME_DESC,
  },
  {
    label: t('filesList.sortOptions.lastModifiedAsc'),
    value: Sort.LAST_MODIFIED_ASC,
  },
  {
    label: t('filesList.sortOptions.lastModifiedDesc'),
    value: Sort.LAST_MODIFIED_DESC,
  },
  {
    label: t('filesList.sortOptions.sizeAsc'),
    value: Sort.SIZE_ASC,
  },
  {
    label: t('filesList.sortOptions.sizeDesc'),
    value: Sort.SIZE_DESC,
  },
];
