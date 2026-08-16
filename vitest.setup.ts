import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// jsdom ne fournit pas ResizeObserver : les popups ancrés de Base UI (Menu,
// Select — via leur Positioner floating-ui) l'utilisent pour recalculer leur
// position, et échouent silencieusement à s'ouvrir sans lui en environnement
// de test.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

afterEach(cleanup);
