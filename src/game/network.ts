import type { Account, RoomSnapshot, OnlineCommand } from "../interfaces";
export async function onlineRequest<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    credentials: "same-origin",
    ...(body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error(
      "Online server unavailable. Reload after the server starts.",
    );
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      "Online server returned an incomplete response. Please retry.",
    );
  }
  if (!response.ok) throw new Error(data.error ?? "Connection failed.");
  return data as T;
}
export class OnlineConnection {
  account: Account | null = null;
  room: RoomSnapshot | null = null;
  connected = false;
  private events: EventSource | null = null;
  private sending = false;
  constructor(
    private onRoom: (room: RoomSnapshot | null) => void,
    private onStatus: (message: string) => void,
  ) {}
  watch(): void {
    this.events?.close();
    this.events = new EventSource("/api/events");
    this.events.onopen = () => {
      this.connected = true;
      this.onStatus("CONNECTED");
    };
    this.events.onerror = () => {
      this.connected = false;
      this.onStatus("RECONNECTING…");
    };
    this.events.onmessage = (event) => {
      this.room = JSON.parse(event.data);
      this.onRoom(this.room);
    };
  }
  async command(command: OnlineCommand): Promise<void> {
    if (!this.room || !this.connected || this.sending) return;
    this.sending = true;
    try {
      await onlineRequest("command", command);
    } catch (error) {
      this.onStatus((error as Error).message);
    } finally {
      this.sending = false;
    }
  }
  async action(command: OnlineCommand): Promise<void> {
    if (!this.room || !this.connected) return;
    try {
      await onlineRequest("command", command);
    } catch (error) {
      this.onStatus((error as Error).message);
    }
  }
  close(): void {
    this.events?.close();
    this.events = null;
    this.connected = false;
    this.room = null;
  }
}
