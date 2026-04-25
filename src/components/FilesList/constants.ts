import { Sort } from './types';
import { t } from '@grafana/i18n';

/**
 * Sort Options
 */
export const SORT_OPTIONS = [
  {
    label: t('nameAToZ', 'Name: A to Z'),
    value: Sort.NAME_ASC,
  },
  {
    label: t('nameZToA', 'Name: Z to A'),
    value: Sort.NAME_DESC,
  },
  {
    label: t('modifiedOldest', 'Modified: oldest'),
    value: Sort.LAST_MODIFIED_ASC,
  },
  {
    label: t('modifiedNewest', 'Modified: newest'),
    value: Sort.LAST_MODIFIED_DESC,
  },
  {
    label: t('sizeSmallest', 'Size: smallest'),
    value: Sort.SIZE_ASC,
  },
  {
    label: t('sizeBiggest', 'Size: biggest'),
    value: Sort.SIZE_DESC,
  },
];
