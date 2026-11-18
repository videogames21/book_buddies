// The completion page (UC-PAR-create-kid-account step 10). The path template is fixed
// here; the child ID in it comes from the route, never from a request field, so the
// redirect cannot be steered elsewhere. Not `server-only`: the form navigates with it.
export const onboardingCompletePath = (childId: string) =>
  `/parent/children/${childId}/onboarding-complete`;

// The parent's home page is not built yet (UC-PAR-onboarding). Until it is, the
// "already complete" error shows with no link back; set this to the route then.
export const PARENT_HOME_PATH: string | null = null;
