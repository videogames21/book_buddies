import "server-only";
import NextAuth from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { getConfig } from "@/server/lib/config";
import { getMongoClient } from "@/server/lib/db";

// Auth.js with database sessions (KD-auth-sessions). The sign-in providers and the
// Credentials-to-database-session glue arrive with UC-PAR-onboarding; this use case
// only reads the session. The config is a function so the environment is read on
// first request, not at build time.
export const { auth } = NextAuth(() => ({
  adapter: MongoDBAdapter(() => getMongoClient(), { databaseName: getConfig().MONGODB_DB }),
  session: { strategy: "database" },
  providers: [],
  callbacks: {
    // The default callback drops the user's ID, which requireParent() needs. Nothing
    // else is passed on, so a session never carries an email address or name.
    session: ({ session, user }) => ({ ...session, user: { id: user.id } }),
  },
}));
