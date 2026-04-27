import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';

/**
 * Styles
 * @param theme
 * @constructor
 */
export const getStyles = (theme: GrafanaTheme2) => {
  return {
    root: css`
      overflow: auto;
      max-height: 100%;
    `,
    header: css`
      margin-bottom: ${theme.spacing(0.5)};
      gap: ${theme.spacing(0.5)};
      display: flex;
      position: sticky;
      top: 0;
      z-index: 2;
      padding-bottom: ${theme.spacing(0.5)};
      background-color: ${theme.colors.background.primary};
      flex-wrap: wrap;
    `,
    list: css`
      display: flex;
      flex-direction: column;
      position: relative;
      z-index: 1;
    `,
    error: css`
      margin: ${theme.spacing(1, 1, 0)};
    `,
  };
};
