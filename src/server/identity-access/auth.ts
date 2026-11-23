import "server-only";
import { logUnexpectedError } from "@/server/lib/log";
import {
  getServerSession,
  type AuthOptions,
  type DefaultSession,
} from "next-auth";
import { cookies } from "next/headers";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { getAppUrl, getConfig } from "@/server/lib/config";
import { getMongoClient } from "@/server/lib/db";
import { SESSION_MAX_AGE_SECONDS, sessionCookie } from "./session-cookie";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

// Auth.js with database sessions (KD-auth-sessions). Auth.js reads, expires and
// deletes sessions; Identity & Access writes them (sessions.ts), so sign-up can create
// one inside its transaction (design/par.md, refinement of KD-auth-sessions). There
// are no providers. The config is a function so the environment is read on first
// request, not at build time.
export async function auth() {
  // Establish the request boundary before reading runtime-only configuration.
  await cookies();
  // APP_URL is the app's one origin setting; Auth.js reads this name for it. Writing it
  // on every request is safe: the value is the same for the life of the process and
  // comes from configuration, never from the request.
  process.env.NEXTAUTH_URL = getAppUrl();
  return getServerSession({
    adapter: MongoDBAdapter(() => getMongoClient(), {
      databaseName: getConfig().MONGODB_DB,
    }),
    session: { strategy: "database", maxAge: SESSION_MAX_AGE_SECONDS },
    useSecureCookies: sessionCookie().secure,
    secret: getConfig().AUTH_SECRET,
    providers: [],
    logger: {
      error: (_code, metadata) => {
        logUnexpectedError("auth", metadata);
      },
    },
    callbacks: {
      // The default callback drops the user's ID, which requireParent() needs. Nothing
      // else is passed on, so a session never carries an email address or name.
      session: ({ session, user }) => ({ ...session, user: { id: user.id } }),
    },
  } satisfies AuthOptions);
}
