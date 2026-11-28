import { z } from "zod";

// A notice's database ID (§8.2.5).
export const noticeIdSchema = z.string().regex(/^[0-9a-f]{24}$/);
