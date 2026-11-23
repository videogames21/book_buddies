// The routes UC-PAR-onboarding and its supporting flows (OI-44) send a parent between.
// Fixed strings, never built from a request field. Not `server-only`: forms navigate
// with them.

export const SIGN_UP_PATH = "/sign-up";
export const SIGN_IN_PATH = "/sign-in";
export const FORGOT_PASSWORD_PATH = "/forgot-password";
export const PARENT_HOME_PATH = "/parent";
export const CHECK_EMAIL_PATH = "/parent/onboarding/check-email";
export const NEW_CHILD_PATH = "/parent/children/new";

/** Query flag for 5b: sign-up saved the account but the email could not be sent. */
export const NOT_SENT_FLAG = "notSent";
