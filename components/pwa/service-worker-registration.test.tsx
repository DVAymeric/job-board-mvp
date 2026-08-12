import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";

describe("ServiceWorkerRegistration", () => {
  const register = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    register.mockClear();
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register },
      configurable: true,
    });
  });

  afterEach(() => {
    // @ts-expect-error cleaning up the test-only stub
    delete navigator.serviceWorker;
  });

  it("registers the service worker on mount", () => {
    render(<ServiceWorkerRegistration />);
    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("renders nothing", () => {
    const { container } = render(<ServiceWorkerRegistration />);
    expect(container).toBeEmptyDOMElement();
  });

  it("does nothing when the browser has no service worker support", () => {
    // @ts-expect-error simulating an unsupported browser
    delete navigator.serviceWorker;
    expect(() => render(<ServiceWorkerRegistration />)).not.toThrow();
  });
});
