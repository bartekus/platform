import { router, authedProcedure } from "~/lib/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { users } from "~/db/auth-schema";

export const usersRouter = router({
  // Create or update user from Logto info
  upsert: authedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().email().or(z.string().min(1)), // Allow non-email strings
        image: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      
      // Check if user exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      if (existingUser.length > 0) {
        // Update existing user
        const [updatedUser] = await db
          .update(users)
          .set({
            name: input.name,
            email: input.email,
            image: input.image,
            updatedAt: new Date(),
          })
          .where(eq(users.id, input.id))
          .returning();

        return { user: updatedUser, created: false };
      } else {
        // Create new user
        const [newUser] = await db
          .insert(users)
          .values({
            id: input.id,
            name: input.name,
            email: input.email,
            image: input.image,
            emailVerified: true, // Logto users are verified
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        return { user: newUser, created: true };
      }
    }),

  create: authedProcedure.input(z.any()).mutation(async () => {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Can't create new users through API",
    });
  }),

  update: authedProcedure.input(z.object({ id: z.string(), data: z.any() })).mutation(async () => {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Can't edit users through API",
    });
  }),

  delete: authedProcedure.input(z.object({ id: z.string() })).mutation(async () => {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Can't delete users through API",
    });
  }),
});
