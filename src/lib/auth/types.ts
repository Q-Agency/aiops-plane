// Shared, client-safe auth types. No secrets here.

/** Which data source an account is wired to. */
export type DataMode = "mock" | "real";

export type AppUser = {
  email: string;
  name: string;
  /**
   * "mock" → demo account, shows the bundled mock data.
   * "real" → production account that WILL be backed by live agent data.
   *          (Not connected yet — currently still renders mock.)
   */
  dataMode: DataMode;
};
