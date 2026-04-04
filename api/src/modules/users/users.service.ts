import { prisma } from "../../integrations/db/client";

export const findUserById = (id: string) => prisma.user.findUnique({ where: { id } });
export const findUserByEmail = (email: string) => prisma.user.findUnique({ where: { email } });

export const createUser = (data: { email: string; passwordHash: string; displayName?: string }) =>
  prisma.user.create({ data });

export const incrementBalance = (userId: string, amount: number) =>
  prisma.user.update({ where: { id: userId }, data: { tokenBalance: { increment: amount } } });

export const decrementBalance = (userId: string, amount: number) =>
  prisma.user.update({ where: { id: userId }, data: { tokenBalance: { decrement: amount } } });
