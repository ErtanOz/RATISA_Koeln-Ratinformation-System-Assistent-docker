import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GeminiCard } from './ui';

describe('GeminiCard markdown rendering', () => {
  it('escapes HTML from model output while keeping bold markdown', () => {
    const { container } = render(
      <GeminiCard
        title="Analyse"
        content={'Normal **fett** <img src=x onerror="alert(1)" />'}
        isLoading={false}
      />,
    );

    expect(screen.getByText('fett')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<img src=x onerror="alert(1)" />');
  });
});
