"use server";

import { z } from "zod";
import { getChildForFamily } from "@/server/accounts-family/child-accounts";
import { readChildData } from "@/server/accounts-family/child-data";
import { verifyParentPassword } from "@/server/identity-access/parent-reauth";
import { requireParent } from "@/server/identity-access/sessions";
import { fail } from "@/server/lib/action-result";
import { logUnexpectedError } from "@/server/lib/log";

const schema = z.strictObject({
  childId: z.uuid(),
  password: z.string().min(1).max(128),
});

async function confirmAndRead(input: unknown, intent: "review" | "export") {
  try {
    const parent = await requireParent();
    if (!parent.ok) return parent;
    const parsed = schema.safeParse(input);
    if (!parsed.success)
      return fail(
        "INVALID_INPUT",
        "Choose a child and enter your own password.",
      );
    const { childId, password } = parsed.data;
    if (!(await getChildForFamily(parent.data.familyId, childId))) {
      return fail("CHILD_NOT_FOUND", "We couldn't find that child.");
    }
    const credential = await verifyParentPassword(parent.data, password);
    if (!credential.ok) return credential;
    return await readChildData(parent.data, childId, intent);
  } catch (error) {
    return fail(
      intent === "review" ? "LOAD_FAILED" : "EXPORT_FAILED",
      "We couldn't complete the request. Try again.",
      logUnexpectedError("confirmChildData", error),
    );
  }
}

export async function reviewChildData(input: unknown) {
  return confirmAndRead(input, "review");
}

export async function exportChildData(input: unknown) {
  return confirmAndRead(input, "export");
}
