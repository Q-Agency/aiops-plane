// Shared, client-safe auth types. No secrets here.

/** Which data source an account is wired to. */
// Neutral mode names on purpose — these values are serialized into the SSR
// hydration payload, so they must NOT reveal that an account shows sample data.
export type DataMode = "standard" | "real";

export type AppUser = {
  email: string;
  name: string;
  /**
   * "standard" → default workspace (currently backed by the bundled sample data;
   *              never surfaced in the UI as demo/mock).
   * "real"     → production account that WILL be backed by live agent data.
   *              (Not connected yet — currently still renders the same data.)
   */
  dataMode: DataMode;
};
