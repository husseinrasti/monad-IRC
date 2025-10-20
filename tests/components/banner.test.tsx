/**
 * Component test to verify ASCII banner renders correctly
 */
import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IRCProvider } from '@/lib/context/IRCContext';
import MainTerminal from '@/components/terminal/MainTerminal';

// Mock Convex client
jest.mock('@/lib/api/client', () => ({
  api: {},
  convexReact: {
    watchQuery: jest.fn(() => ({
      onUpdate: jest.fn(() => jest.fn()),
    })),
  },
}));

// Mock useCommandHandler
jest.mock('@/lib/hooks/useCommandHandler', () => ({
  useCommandHandler: () => ({
    handleCommand: jest.fn(),
    handleRegularMessage: jest.fn(),
  }),
}));

describe('ASCII Banner Rendering', () => {
  it('should render the banner element with correct accessibility attributes', () => {
    render(
      <IRCProvider>
        <MainTerminal />
      </IRCProvider>
    );

    // Check that banner element exists with proper accessibility
    const banner = screen.getByRole('img', { name: /monad irc ascii banner/i });
    expect(banner).toBeInTheDocument();
  });

  it('should contain MONAD text in the banner', () => {
    render(
      <IRCProvider>
        <MainTerminal />
      </IRCProvider>
    );

    // Check that the banner contains the word "MONAD" (as ASCII art)
    const bannerElement = screen.getByRole('img', { name: /monad irc ascii banner/i });
    expect(bannerElement.textContent).toContain('MMMMMMMM');
    expect(bannerElement.textContent).toContain('OOOOOOOOO');
    expect(bannerElement.textContent).toContain('NNNNNNNN');
    expect(bannerElement.textContent).toContain('DDDDDDDDDDDDD');
  });

  it('should have proper monospace font styling', () => {
    render(
      <IRCProvider>
        <MainTerminal />
      </IRCProvider>
    );

    const banner = screen.getByRole('img', { name: /monad irc ascii banner/i });
    
    // Check for overflow handling (allows horizontal scroll on narrow screens)
    expect(banner).toHaveClass('overflow-x-auto');
  });

  it('should have whitespace preservation for ASCII art alignment', () => {
    render(
      <IRCProvider>
        <MainTerminal />
      </IRCProvider>
    );

    const banner = screen.getByRole('img', { name: /monad irc ascii banner/i });
    const bannerLines = banner.querySelectorAll('div');
    
    // Check that banner lines have whitespace-pre class for proper spacing
    bannerLines.forEach((line) => {
      expect(line).toHaveClass('whitespace-pre');
    });
  });

  it('should render all banner lines (20 lines total)', () => {
    render(
      <IRCProvider>
        <MainTerminal />
      </IRCProvider>
    );

    const banner = screen.getByRole('img', { name: /monad irc ascii banner/i });
    const bannerLines = banner.querySelectorAll('div');
    
    // Should have 20 lines (2 empty + 16 ASCII + 2 empty)
    expect(bannerLines.length).toBe(20);
  });

  it('should be responsive with text scaling', () => {
    render(
      <IRCProvider>
        <MainTerminal />
      </IRCProvider>
    );

    const banner = screen.getByRole('img', { name: /monad irc ascii banner/i });
    const firstLine = banner.querySelector('div');
    
    // Check that responsive text sizing is applied
    expect(firstLine).toHaveClass('text-xs');
    expect(firstLine).toHaveClass('sm:text-sm');
    expect(firstLine).toHaveClass('md:text-base');
  });
});

