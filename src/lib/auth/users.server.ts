import type { AppUser } from "./types";

// Prototype credential store — hardcoded for now. The `.server.ts` suffix keeps
// this file (and the passwords) out of the client bundle.
//
// Replace with a real identity provider before connecting live agent data.

type StoredUser = AppUser & { password: string };

const USERS: StoredUser[] = [
  {
    email: "qai@q.agency",
    password: "demo",
    name: "QAI",
    dataMode: "standard",
  },
  {
    email: "zlatko@q.agency",
    password: "password",
    name: "Zlatko Matokanović",
    dataMode: "real",
  },
];

function toAppUser(u: StoredUser): AppUser {
  return { email: u.email, name: u.name, dataMode: u.dataMode };
}

export function verifyCredentials(email: string, password: string): AppUser | null {
  const norm = email.trim().toLowerCase();
  const found = USERS.find((u) => u.email.toLowerCase() === norm && u.password === password);
  return found ? toAppUser(found) : null;
}

export function findUserByEmail(email: string): AppUser | null {
  const norm = email.trim().toLowerCase();
  const found = USERS.find((u) => u.email.toLowerCase() === norm);
  return found ? toAppUser(found) : null;
}
