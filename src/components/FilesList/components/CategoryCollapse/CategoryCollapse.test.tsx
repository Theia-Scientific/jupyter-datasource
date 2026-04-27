import { render, screen } from '@testing-library/react';
import React from 'react';

import { CategoryCollapse } from './CategoryCollapse';

type Props = React.ComponentProps<typeof CategoryCollapse>;

/**
 * In Test Ids
 */
const InTestIds = {
  header: 'data-testid header',
  content: 'data-testid content',
  buttonRemove: 'data-testid button-remove',
};

describe('Category Collapse', () => {
  /**
   * Get Tested Component
   */
  const getComponent = (props: Partial<Props>) => {
    return <CategoryCollapse headerTestId={InTestIds.header} contentTestId={InTestIds.content} {...props} />;
  };

  it('Should expand content', () => {
    const { rerender } = render(getComponent({ isOpen: false }));

    expect(screen.queryByTestId(InTestIds.content)).not.toBeInTheDocument();

    rerender(getComponent({ isOpen: true }));

    expect(screen.getByTestId(InTestIds.content)).toBeInTheDocument();
  });
});
