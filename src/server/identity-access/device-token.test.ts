import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The trusted-device cookie (design/shlf.md, Components and Tests). Invented IDs only.

type Options = Record<string, unknown>;
const jar = vi.hoisted(() => new Map<string, { value: string } & Options>());
vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) => jar.get(name),
      set: (name: string, value: string, options: Options) =>
        jar.set(name, { value, ...options }),
    }),
}));

const SECRET = "invented-device-secret-for-tests-only";
const AT = new Date("2026-11-26T15:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const after = (ms: number) => new Date(AT.getTime() + ms);

async function load(settings: Record<string, string> = {}) {
  vi.resetModules();
  vi.stubEnv("AUTH_SECRET", "invented-auth-secret");
  vi.stubEnv("MONGODB_URI", "mongodb://127.0.0.1:27017");
  vi.stubEnv("CHILD_DEVICE_SECRET", SECRET);
  for (const [name, value] of Object.entries(settings)) {
    vi.stubEnv(name, value);
  }
  const clock = await import("@/server/lib/clock");
  let at = AT;
  clock.setClock(() => at);
  return {
    ...(await import("./device-token")),
    setTime: (time: Date) => {
      at = time;
    },
  };
}

const cookie = () => {
  const stored = jar.get("child_device");
  if (!stored) throw new Error("no child_device cookie");
  return stored;
};
const entries = () =>
  JSON.parse(
    Buffer.from(cookie().value.split(".")[0] ?? "", "base64url").toString(),
  ) as { deviceId: string; childId: string; expiresAt: number }[];
const signed = (payload: string, secret = SECRET) =>
  `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
const encoded = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

beforeEach(() => {
  jar.clear();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("child_device cookie", () => {
  it("is httpOnly, Secure and SameSite=Lax, and lasts 30 days", async () => {
    const { issueDeviceToken } = await load();
    await issueDeviceToken("child-a");
    expect(cookie()).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/child",
      expires: after(30 * DAY_MS),
    });
  });

  it("holds a random device ID, the child ID and an expiry, and nothing else", async () => {
    const { issueDeviceToken } = await load();
    await issueDeviceToken("child-a");
    expect(entries()).toEqual([
      {
        deviceId: expect.stringMatching(/^[0-9a-f]{32}$/) as string,
        childId: "child-a",
        expiresAt: after(30 * DAY_MS).getTime(),
      },
    ]);
  });

  it("trusts the browser for that child only", async () => {
    const { issueDeviceToken, readTrustedDevice } = await load();
    expect(await readTrustedDevice("child-a")).toBeNull();
    await issueDeviceToken("child-a");
    expect(await readTrustedDevice("child-a")).toBe(entries()[0]?.deviceId);
    expect(await readTrustedDevice("child-b")).toBeNull();
  });

  it("stops trusting at the expiry, read against now()", async () => {
    const { issueDeviceToken, readTrustedDevice, setTime } = await load();
    await issueDeviceToken("child-a");
    setTime(after(30 * DAY_MS - 1));
    expect(await readTrustedDevice("child-a")).not.toBeNull();
    setTime(after(30 * DAY_MS));
    expect(await readTrustedDevice("child-a")).toBeNull();
  });

  const forged = [
    {
      deviceId: "forged",
      childId: "child-a",
      expiresAt: AT.getTime() + DAY_MS,
    },
  ];
  it.each([
    ["no signature", encoded(forged)],
    ["another secret", signed(encoded(forged), `${SECRET}-other`)],
    ["an extra part", `${signed(encoded(forged))}.more`],
    ["a short signature", `${encoded(forged)}.AAAA`],
    ["signed text that is not JSON", signed("bm90LWpzb24")],
    ["a signed list of the wrong shape", signed(encoded([{ childId: "x" }]))],
    ["nothing readable", "not a token"],
  ])("trusts nothing for a cookie with %s", async (_label, value) => {
    const { readTrustedDevice } = await load();
    jar.set("child_device", { value });
    expect(await readTrustedDevice("child-a")).toBeNull();
  });

  it("trusts nothing once the list has been edited", async () => {
    const { issueDeviceToken, readTrustedDevice } = await load();
    await issueDeviceToken("child-a");
    const [, signature] = cookie().value.split(".");
    const edited = encoded([{ ...entries()[0], childId: "child-b" }]);
    jar.set("child_device", { value: `${edited}.${signature}` });
    expect(await readTrustedDevice("child-b")).toBeNull();
    expect(await readTrustedDevice("child-a")).toBeNull();
  });

  it("renews a child's entry, keeping its device ID and the other children", async () => {
    const { issueDeviceToken, setTime } = await load();
    await issueDeviceToken("child-a");
    await issueDeviceToken("child-b");
    const [first, second] = entries();
    setTime(after(DAY_MS));
    await issueDeviceToken("child-a");
    expect(entries()).toEqual([
      second,
      { ...first, expiresAt: after(31 * DAY_MS).getTime() },
    ]);
    expect(cookie().expires).toEqual(after(31 * DAY_MS));
  });

  it("drops expired entries when it issues", async () => {
    const { issueDeviceToken, setTime } = await load();
    await issueDeviceToken("child-a");
    setTime(after(30 * DAY_MS));
    await issueDeviceToken("child-b");
    expect(entries().map((entry) => entry.childId)).toEqual(["child-b"]);
  });

  it("keeps four children, the oldest going first", async () => {
    const { issueDeviceToken } = await load();
    for (const child of ["a", "b", "c", "d", "e"]) {
      await issueDeviceToken(child);
    }
    expect(entries().map((entry) => entry.childId)).toEqual([
      "b",
      "c",
      "d",
      "e",
    ]);
  });

  it("keeps as many children as configured", async () => {
    const { issueDeviceToken } = await load({
      CHILD_DEVICE_MAX_CHILDREN: "1",
    });
    await issueDeviceToken("child-a");
    await issueDeviceToken("child-b");
    expect(entries().map((entry) => entry.childId)).toEqual(["child-b"]);
  });

  it("fails closed with no secret", async () => {
    const { issueDeviceToken } = await load({ CHILD_DEVICE_SECRET: "" });
    await expect(issueDeviceToken("child-a")).rejects.toThrow(
      "CHILD_DEVICE_SECRET must be configured",
    );
    expect(jar.size).toBe(0);
  });
});
