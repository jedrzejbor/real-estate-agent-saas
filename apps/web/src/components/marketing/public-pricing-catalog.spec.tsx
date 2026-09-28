import { renderToStaticMarkup } from 'react-dom/server';
import { useSearchParams } from 'next/navigation';
import { PublicPricingCatalog } from './public-pricing-catalog';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/cennik'),
  useSearchParams: jest.fn(),
}));

const useSearchParamsMock = useSearchParams as jest.MockedFunction<
  typeof useSearchParams
>;

describe('public pricing catalog audience boundary', () => {
  it('defaults to the private pricing and hides subscription intervals', () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams() as ReturnType<typeof useSearchParams>,
    );

    const html = renderToStaticMarkup(<PublicPricingCatalog surface="full" />);

    expect(html).toContain('Sprzedaję prywatnie');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('Jednorazowa opłata — bez abonamentu.');
    expect(html).not.toContain('Miesięcznie');
  });

  it('shows billing intervals for the agent audience', () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams('dla=agentow') as ReturnType<typeof useSearchParams>,
    );

    const html = renderToStaticMarkup(<PublicPricingCatalog surface="full" />);

    expect(html).toContain('Jestem agentem lub prowadzę biuro');
    expect(html).toContain('Miesięcznie');
    expect(html).toContain('Rocznie');
  });
});
