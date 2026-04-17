import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';

/**
 * Styles
 * @param theme
 * @constructor
 */
export const getStyles = (theme: GrafanaTheme2) => {
  return {
    noModeContainer: css`
      padding: ${theme.spacing(1, 2)};
      display: flex;
      justify-content: center;
    `,
    fileContainer: css`
      padding: ${theme.spacing(1, 2)};
    `,
    folderContainer: css`
      padding: ${theme.spacing(1, 2)};
    `,
    folderButton: css`
      margin-left: ${theme.spacing(0.5)};
      margin-bottom: ${theme.spacing(0.5)};
      display: flex;
      align-items: center;
    `,
  };
};
