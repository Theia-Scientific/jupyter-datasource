import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';

/**
 * Styles
 * @param theme
 * @constructor
 */
export const getStyles = (theme: GrafanaTheme2) => {
  return {
    cardContainer: css`
      display: flex;
      align-items: center;
      margin-bottom: ${theme.spacing(0.75)};
      flex: auto;
    `,
    card: css`
      padding: ${theme.spacing(1)} ${theme.spacing(2)};
      margin-bottom: 0;
    `,
    checkbox: css({
      marginRight: theme.spacing(1),
    }),
    metaContainer: css`
      display: flex;
      align-items: center;
      margin-right: ${theme.spacing(1)};

      svg {
        margin-right: ${theme.spacing(0.5)};
      }
    `,
    editActions: css`
      display: flex;
      align-items: center;
      gap: ${theme.spacing(0.5)};
      margin: ${theme.spacing(0, 1, 0.5)};
    `,
    cardButton: css`
      align-items: baseline;
    `,
  };
};
