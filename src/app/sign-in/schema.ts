import { z } from "zod";

// Limits from design/par-field-values.md. The password maximum also bounds what the
// server hashes for an anonymous caller.
export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z.string().min(1).max(128),
});
