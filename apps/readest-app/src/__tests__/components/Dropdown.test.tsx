import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen, cleanup, fireEvent } from '@testing-library/react';

import { createRef } from 'react';
import Dropdown, { DropdownHandle } from '@/components/Dropdown';
import { DropdownProvider } from '@/context/DropdownContext';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => (s: string) => s,
}));

afterEach(() => cleanup());

// Simulates the browser behavior where pressing Enter/Space on a focused
// <button> fires both a keydown event and a click event. JSDOM does not
// dispatch the click automatically, so we do it here.
const pressActivationKey = (el: HTMLElement, key: 'Enter' | ' ') => {
  fireEvent.keyDown(el, { key });
  fireEvent.click(el);
};

const renderDropdown = () =>
  render(
    <DropdownProvider>
      <Dropdown label='Test Menu' toggleButton={<span>Toggle</span>} showTooltip={false}>
        <div>
          <button type='button'>Menu Item</button>
        </div>
      </Dropdown>
    </DropdownProvider>,
  );

describe('Dropdown keyboard activation', () => {
  it('opens when Enter is pressed on the toggle button', () => {
    renderDropdown();
    const toggle = screen.getByRole('button', { name: 'Test Menu' });

    toggle.focus();
    pressActivationKey(toggle, 'Enter');

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('opens when Space is pressed on the toggle button', () => {
    renderDropdown();
    const toggle = screen.getByRole('button', { name: 'Test Menu' });

    toggle.focus();
    pressActivationKey(toggle, ' ');

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('closes when Enter is pressed again on an open dropdown', () => {
    renderDropdown();
    const toggle = screen.getByRole('button', { name: 'Test Menu' });

    toggle.focus();
    pressActivationKey(toggle, 'Enter');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    pressActivationKey(toggle, 'Enter');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('stops propagation on Enter to prevent global shortcuts from firing', () => {
    renderDropdown();
    const toggle = screen.getByRole('button', { name: 'Test Menu' });

    const onWindowKeyDown = vi.fn();
    window.addEventListener('keydown', onWindowKeyDown);
    try {
      toggle.focus();
      fireEvent.keyDown(toggle, { key: 'Enter' });
      expect(onWindowKeyDown).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('keydown', onWindowKeyDown);
    }
  });

  it('stops propagation on Space to prevent global shortcuts from firing', () => {
    renderDropdown();
    const toggle = screen.getByRole('button', { name: 'Test Menu' });

    const onWindowKeyDown = vi.fn();
    window.addEventListener('keydown', onWindowKeyDown);
    try {
      toggle.focus();
      fireEvent.keyDown(toggle, { key: ' ' });
      expect(onWindowKeyDown).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('keydown', onWindowKeyDown);
    }
  });
});

describe('Dropdown handle (a toggle elsewhere, such as the Duo native bar)', () => {
  const renderWithHandle = () => {
    const ref = createRef<DropdownHandle>();
    const view = render(
      <DropdownProvider>
        <Dropdown
          ref={ref}
          label='Test Menu'
          toggleButton={<span>Toggle</span>}
          showTooltip={false}
        >
          <div>
            <button type='button'>Menu Item</button>
          </div>
        </Dropdown>
      </DropdownProvider>,
    );
    return { ...view, ref };
  };

  it('open() shows the menu and moves focus onto its first item', () => {
    const { ref } = renderWithHandle();
    act(() => ref.current!.open());
    expect(screen.getByRole('button', { name: 'Test Menu' }).getAttribute('aria-expanded')).toBe(
      'true',
    );
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Menu Item' }));
  });

  it('toggle() closes an open menu and opens a closed one', () => {
    const { ref } = renderWithHandle();
    const toggle = screen.getByRole('button', { name: 'Test Menu' });
    act(() => ref.current!.toggle());
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    act(() => ref.current!.toggle());
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: 'Menu Item' })).toBeNull();
  });

  it('a click on the HTML toggle leaves focus where it was', () => {
    renderWithHandle();
    const toggle = screen.getByRole('button', { name: 'Test Menu' });
    toggle.focus();
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(toggle);
  });
});
