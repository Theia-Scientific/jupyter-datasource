import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';

/**
 * Styles
 * @param theme
 * @constructor
 */
export const getStyles = (theme: GrafanaTheme2) => {
  return {
    directory: css`
      align-items: flex-start;
      background: ${theme.colors.background.primary};

      &:not(:last-child) {
        border-bottom: solid 1px ${theme.colors.border.weak};
      }
      &:not(:has(+ &)) {
        margin-bottom: ${theme.spacing(1)};
      }
    `,
    spinner: css`
      align-items: center;
      display: flex;
      justify-content: center;
      min-height: 60px;
    `,
    rootLevel: css`
      padding-bottom: ${theme.spacing(0.75)};
    `,
    item: css`
      display: flex;
      align-items: center;
    `,
    checkbox: css`
      display: flex;
      padding: ${theme.spacing(0, 1)};
    `,
    categoryCheckbox: css`
      margin-top: ${theme.spacing(2.5)};
      padding-right: 0;
    `,
  };
};
