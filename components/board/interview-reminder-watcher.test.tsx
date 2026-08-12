import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { InterviewReminderWatcher } from "@/components/board/interview-reminder-watcher";

function job(id: string, interviewDate: Date | null) {
  return { id, title: `Job ${id}`, companyName: "Acme", interviewDate };
}

describe("InterviewReminderWatcher", () => {
  const notifyMock = vi.fn();
  const requestPermissionMock = vi.fn();

  beforeEach(() => {
    notifyMock.mockReset();
    requestPermissionMock.mockReset().mockResolvedValue("granted");

    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
    });

    class FakeNotification {
      static permission: NotificationPermission = "granted";
      static requestPermission = requestPermissionMock;
      constructor(title: string, options?: NotificationOptions) {
        notifyMock(title, options);
      }
    }
    vi.stubGlobal("Notification", FakeNotification);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("notifies once for an interview within the next 24h", async () => {
    const upcoming = new Date(Date.now() + 60 * 60 * 1000);
    render(<InterviewReminderWatcher jobs={[job("a", upcoming)]} />);

    await vi.waitFor(() => expect(notifyMock).toHaveBeenCalledTimes(1));
    expect(notifyMock.mock.calls[0][0]).toBe("Entretien à venir");
  });

  it("does not notify twice for the same interview across renders", async () => {
    const upcoming = new Date(Date.now() + 60 * 60 * 1000);
    const { rerender } = render(<InterviewReminderWatcher jobs={[job("a", upcoming)]} />);
    await vi.waitFor(() => expect(notifyMock).toHaveBeenCalledTimes(1));

    rerender(<InterviewReminderWatcher jobs={[job("a", upcoming)]} />);
    await new Promise((r) => setTimeout(r, 10));
    expect(notifyMock).toHaveBeenCalledTimes(1);
  });

  it("does not notify for an interview outside the 24h window", async () => {
    const farAway = new Date(Date.now() + 72 * 60 * 60 * 1000);
    render(<InterviewReminderWatcher jobs={[job("a", farAway)]} />);

    await new Promise((r) => setTimeout(r, 10));
    expect(notifyMock).not.toHaveBeenCalled();
  });
});
