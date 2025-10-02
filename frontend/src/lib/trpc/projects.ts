import { router, authedProcedure, generateTxId } from "~/lib/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import { projectsTable, createProjectSchema, updateProjectSchema } from "~/db/schema";
import { users } from "~/db/auth-schema";

export const projectsRouter = router({
  create: authedProcedure
    .input(
      createProjectSchema.extend({
        userInfo: z.object({
          name: z.string(),
          email: z.string().email(),
          image: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const { userInfo, ...projectData } = input;

      // First, ensure the user exists in the database
      const existingUser = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);

      if (existingUser.length === 0) {
        // Create the user if they don't exist
        await db.insert(users).values({
          id: session.user.id,
          name: userInfo.name,
          email: userInfo.email,
          image: userInfo.image,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Now create the project
      const result = await db.transaction(async (tx) => {
        const txid = await generateTxId(tx);
        const [newItem] = await tx.insert(projectsTable).values(projectData).returning();
        return { item: newItem, txid };
      });

      return result;
    }),

  update: authedProcedure
    .input(
      z.object({
        id: z.number(),
        data: updateProjectSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);
        const [updatedItem] = await tx
          .update(projectsTable)
          .set(input.data)
          .where(and(eq(projectsTable.id, input.id), eq(projectsTable.owner_id, ctx.session.user.id)))
          .returning();

        if (!updatedItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or you do not have permission to update it",
          });
        }

        return { item: updatedItem, txid };
      });

      return result;
    }),

  delete: authedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const result = await ctx.db.transaction(async (tx) => {
      const txid = await generateTxId(tx);
      const [deletedItem] = await tx
        .delete(projectsTable)
        .where(and(eq(projectsTable.id, input.id), eq(projectsTable.owner_id, ctx.session.user.id)))
        .returning();

      if (!deletedItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found or you do not have permission to delete it",
        });
      }

      return { item: deletedItem, txid };
    });

    return result;
  }),
});
