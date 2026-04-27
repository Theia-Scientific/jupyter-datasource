import { cx } from '@emotion/css';
import { IconButton, useTheme2 } from '@grafana/ui';
import React from 'react';
import { t } from '@grafana/i18n';

import { getStyles } from './CategoryCollapse.styles';

/**
 * Properties
 */
interface Props {
  /**
   * Title
   */
  title?: React.ReactElement | string;

  /**
   * Children
   */
  children?: React.ReactElement | string;

  /**
   * Is Open?
   */
  isOpen?: boolean;

  /**
   * On Toggle
   */
  onToggle?: (isOpen: boolean) => void;

  /**
   * Header Test Id
   */
  headerTestId?: string;

  /**
   * Content Test Id
   */
  contentTestId?: string;

  /**
   * Class Name
   */
  className?: string;

  /**
   * Content Class Name
   */
  contentClassName?: string;
}

/**
 * Collapse
 */
export const CategoryCollapse: React.FC<Props> = ({
  title,
  children,
  isOpen = false,
  onToggle = () => null,
  headerTestId,
  contentTestId,
  className,
  contentClassName,
}) => {
  /**
   * Styles and Theme
   */
  const theme = useTheme2();
  const styles = getStyles(theme);

  return (
    <div className={cx(styles.root, className)}>
      <div className={styles.header} data-testid={headerTestId} onClick={() => onToggle(!isOpen)}>
        <IconButton
          name={isOpen ? 'angle-down' : 'angle-right'}
          tooltip={isOpen
             ? t('categoryCollapse.icon.collapse.tooltip', 'Collapse')
             : t('categoryCollapse.icon.expand.tooltip', 'Expand')}
          className={styles.collapseIcon}
          aria-expanded={isOpen}
        />
        <div className={styles.title}>{title}</div>
      </div>
      {isOpen && (
        <div className={cx(styles.content, contentClassName)} data-testid={contentTestId}>
          {children}
        </div>
      )}
    </div>
  );
};
