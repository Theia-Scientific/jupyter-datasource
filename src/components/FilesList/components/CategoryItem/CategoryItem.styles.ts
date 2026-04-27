import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';

/**
 * Styles
 * @param theme
 * @constructor
 */
export const getStyles = (theme: GrafanaTheme2) => {
  return {
    icon: css`
      margin-right: ${theme.spacing(1)};
    `,
    wrapper: css`
      flex: auto;
      align-items: center;
      font-size: ${theme.typography.body.fontSize};
      padding: ${theme.spacing(1, 0)};
      border: none;
      color: ${theme.colors.text.secondary};
      z-index: 1;

      &:hover,
      &.selected {
        color: ${theme.colors.text};
      }

      &:hover,
      &:focus-visible,
      &:focus-within {
        a {
          opacity: 1;
        }
      }
    `,
    titleContainer: css`
      display: flex;
      align-items: center;
    `,
    name: css`
      display: flex;
      align-items: center;
      padding: ${theme.spacing(0.5)} 0;
    `,
    text: css`
      flex-grow: 1;
      line-height: 24px;
      margin-right: ${theme.spacing(1)};
    `,
    content: css`
      padding: 0;
    `,
    editAction: css`
      margin-left: ${theme.spacing(1)};
    `,
  };
};
