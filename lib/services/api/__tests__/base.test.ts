jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

import { BaseApiService } from "../base";

describe("BaseApiService", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it("reports client-side request timeouts as timeouts, not cancellations", async () => {
    jest.useFakeTimers();

    global.fetch = jest.fn((_url, init) => {
      const signal = init?.signal as AbortSignal | undefined;

      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener("abort", () => {
          const error = new Error("Aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    }) as typeof fetch;

    const service = new BaseApiService({
      baseUrl: "https://example.test",
      timeout: 50,
    });

    const request = service.request({
      method: "GET",
      url: "/slow",
      skipAuth: true,
    });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(global.fetch).toHaveBeenCalled();

    const assertion = expect(request).rejects.toMatchObject({
      message: "Request timeout",
      code: "TIMEOUT",
    });

    await jest.advanceTimersByTimeAsync(50);

    await assertion;
  });
});
