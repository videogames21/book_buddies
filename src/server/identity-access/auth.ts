import "server-only";
import { logUnexpectedError } from "@/server/lib/log";
import {
  getServerSession,
  type AuthOptions,
  type DefaultSession,
} from "next-auth";
import { cookies } from "next/headers";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { getConfig } from "@/server/lib/config";
import { getMongoClient } from "@/server/lib/db";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

// Auth.js with database sessions (KD-auth-sessions). The sign-in providers and the
// Credentials-to-database-session glue arrive with UC-PAR-onboarding; this use case
// only reads the session. The config is a function so the environment is read on
// first request, not at build time.
export async function auth() {
  // Establish the request boundary before reading runtime-only configuration.
  await cookies();
  return getServerSession({
    adapter: MongoDBAdapter(() => getMongoClient(), {
      databaseName: getConfig().MONGODB_DB,
    }),
    session: { strategy: "database" },
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
