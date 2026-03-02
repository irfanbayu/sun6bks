import { vi } from "vitest";

export const createMidtransCoreApiMock = () => {
  const status = vi.fn();
  return {
    coreApi: {
      transaction: {
        status,
      },
    },
    status,
  };
};
