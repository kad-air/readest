import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// DOM identity with main for the shared Dropdown, closed and open: snapshots
// written with the merge base's (5273f82fc) component files in place; must
// pass unchanged on the branch. Regenerate from the new base after a rebase,
// never from the branch.

import Dropdown from '@/components/Dropdown';
import MenuItem from '@/components/MenuItem';
import { DropdownProvider } from '@/context/DropdownContext';

vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (s: string) => s }));

afterEach(() => cleanup());

const renderDropdown = (disabled = false) =>
  render(
    <DropdownProvider>
      <Dropdown
        label='Test Menu'
        className='dropdown-bottom dropdown-end'
        buttonClassName='btn btn-ghost h-8 min-h-8 w-8 p-0'
        toggleButton={<span>Toggle</span>}
        disabled={disabled}
      >
        <div className='dropdown-content'>
          <MenuItem label='First' onClick={vi.fn()} />
          <MenuItem label='Second' onClick={vi.fn()} />
        </div>
      </Dropdown>
    </DropdownProvider>,
  );

describe('Dropdown DOM parity with main', () => {
  it('renders the same markup as main while closed', () => {
    expect(renderDropdown().container.innerHTML).toMatchSnapshot();
  });

  it('renders the same markup as main while open', () => {
    const { container } = renderDropdown();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Test Menu' }));
    });
    expect(container.innerHTML).toMatchSnapshot();
  });

  it('renders the same markup as main while disabled', () => {
    expect(renderDropdown(true).container.innerHTML).toMatchSnapshot();
  });
});
