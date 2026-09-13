import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from './App';

describe('App', () => {
  it('renders the get started heading', () => {
    render(<App />);
    expect(screen.getByText('Get started')).toBeInTheDocument();
  });

  it('increments the counter when the button is clicked', () => {
    render(<App />);
    const button = screen.getByRole('button', { name: /count is 0/i });

    fireEvent.click(button);

    expect(button).toHaveTextContent('Count is 1');
  });
});
