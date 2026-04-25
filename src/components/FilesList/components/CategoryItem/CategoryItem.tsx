import { Icon, useStyles2 } from '@grafana/ui';
import { TEST_IDS } from '@theia/constants';
import React, { useEffect } from 'react';

import { WebDavDirectory } from '../../types';
import { CategoryCollapse } from '../CategoryCollapse';
import { getStyles } from './CategoryItem.styles';

/**
 * Properties
 */
interface Props {
  /**
   * Item
   *
   * @type {WebDavDirectory}
   */
  item: WebDavDirectory;

  /**
   * Children
   *
   * @type {React.ReactElement}
   */
  children: React.ReactElement;

  /**
   * Load Tree
   * @param item
   */
  loadTree: (item: WebDavDirectory) => void;

  /**
   * Is Expanded
   *
   * @type {boolean}
   */
  isExpanded: boolean;

  /**
   * Is Loading
   *
   * @type {boolean}
   */
  isLoading: boolean;

  /**
   * On Expand
   */
  onExpand: (item: WebDavDirectory, isExpanded: boolean) => void;
}

/**
 * Category Item
 */
export const CategoryItem: React.FC<Props> = ({
  item,
  children,
  loadTree,
  isExpanded,
  isLoading,
  onExpand,
}) => {
  /**
   * Styles
   */
  const styles = useStyles2(getStyles);

  /**
   * Load Children
   */
  useEffect(() => {
    if (isExpanded && !item.children && !isLoading) {
      loadTree(item);
    }
  }, [isExpanded, isLoading, item, loadTree]);

  return (
    <CategoryCollapse
      title={
        <div className={styles.titleContainer}>
          <div className={styles.icon}>
            <Icon name={isExpanded ? 'folder-open' : 'folder'} />
          </div>
          <div className={styles.name} onClick={(event) => event.stopPropagation()}>
            <div className={styles.text}>
              <span>{item.name}</span>
            </div>
          </div>
        </div>
      }
      isOpen={isExpanded}
      className={styles.wrapper}
      contentClassName={styles.content}
      onToggle={(isOpen) => onExpand(item, isOpen)}
      headerTestId={TEST_IDS.filesList.category(item.path)}
      contentTestId={TEST_IDS.filesList.categoryContent(item.path)}
    >
      <>
        {children}
      </>
    </CategoryCollapse>
  );
};
