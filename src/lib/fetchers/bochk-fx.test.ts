import { describe, it, expect, vi } from 'vitest';
import {
  parseBochkFxResponse,
  fetchBochkAccessToken,
  fetchBochkFxRates,
  BOCHK_SANDBOX_BASE,
} from './bochk-fx';

describe('parseBochkFxResponse', () => {
  it('returns [] for unknown shape', () => {
    expect(parseBochkFxResponse(null)).toEqual([]);
    expect(parseBochkFxResponse('nope')).toEqual([]);
    expect(parseBochkFxResponse({ foo: 'bar' })).toEqual([]);
    expect(parseBochkFxResponse([{ no_currency: 'x' }])).toEqual([]);
  });

  it('parses camelCase result envelope', () => {
    const raw = {
      asOf: '2026-05-21T01:00:00Z',
      result: [
        { currency: 'USD', buyTT: 7.79, sellTT: 7.83, buyCash: 7.75, sellCash: 7.87 },
        { currency: 'CNY', buyTT: 1.07, sellTT: 1.09, buyCash: null, sellCash: null },
      ],
    };
    const out = parseBochkFxResponse(raw);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      currency: 'USD',
      buyTT: 7.79,
      sellTT: 7.83,
      buyCash: 7.75,
      sellCash: 7.87,
      timestamp: '2026-05-21T01:00:00Z',
    });
    expect(out[1].currency).toBe('CNY');
    expect(out[1].buyCash).toBeNull();
  });

  it('parses snake_case bare-array shape with string numbers', () => {
    const raw = [
      { ccy: 'usd', buy_tt: '7.79', sell_tt: '7.83' },
      { ccy: 'eur', buy_tt: '8.40', sell_tt: '8.55', cash_buy: '8.30', cash_sell: '8.65' },
    ];
    const out = parseBochkFxResponse(raw);
    expect(out).toHaveLength(2);
    expect(out[0].currency).toBe('USD'); // upper-cased
    expect(out[0].buyTT).toBe(7.79);
    expect(out[1].buyCash).toBe(8.3);
    expect(out[1].sellCash).toBe(8.65);
  });
});

describe('fetchBochkAccessToken', () => {
  it('POSTs basic auth + grant_type=client_credentials and returns access_token', async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      expect(String(url)).toBe(`${BOCHK_SANDBOX_BASE}/auth/oauth/v2/token`);
      expect(init?.method).toBe('POST');
      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toMatch(/^Basic /);
      expect(headers['Content-Type']).toBe('application/x-www-form-urlencoded');
      const body = init?.body as URLSearchParams;
      expect(body.toString()).toBe('grant_type=client_credentials');
      return new Response(JSON.stringify({ access_token: 't0k3n', expires_in: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const tok = await fetchBochkAccessToken({
      creds: { clientId: 'cid', clientSecret: 'csec' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(tok.accessToken).toBe('t0k3n');
    expect(tok.expiresIn).toBe(3600);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('throws on non-2xx', async () => {
    const fetchImpl = vi.fn(async () => new Response('oops', { status: 401, statusText: 'Unauthorized' }));
    await expect(
      fetchBochkAccessToken({
        creds: { clientId: 'x', clientSecret: 'y' },
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/401/);
  });

  it('throws when access_token is missing', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }));
    await expect(
      fetchBochkAccessToken({
        creds: { clientId: 'x', clientSecret: 'y' },
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/access_token/);
  });
});

describe('fetchBochkFxRates', () => {
  it('chains token + rates calls and returns parsed rows', async () => {
    let call = 0;
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      call++;
      const u = String(url);
      if (call === 1) {
        expect(u).toContain('/auth/oauth/v2/token');
        return new Response(JSON.stringify({ access_token: 'TOK', expires_in: 3600 }), { status: 200 });
      }
      expect(u).toBe(`${BOCHK_SANDBOX_BASE}/custom/fx`);
      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer TOK');
      return new Response(
        JSON.stringify({ result: [{ currency: 'HKD', buyTT: 1, sellTT: 1, buyCash: 1, sellCash: 1 }] }),
        { status: 200 },
      );
    });

    const out = await fetchBochkFxRates({
      creds: { clientId: 'a', clientSecret: 'b' },
      endpointPath: '/custom/fx',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out).toHaveLength(1);
    expect(out[0].currency).toBe('HKD');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
