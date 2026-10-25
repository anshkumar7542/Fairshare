import { prisma } from "../../prisma/client.js";
import { HttpError } from "../../utils/http.js";

export async function assertGroupMember(groupId: string, userId: string) {
  const membership = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId, userId } }
  });
  if (!membership) throw new HttpError(403, "Group access denied");
}

export async function getGroupMemberIds(groupId: string) {
  const members = await prisma.groupMembership.findMany({
    where: { groupId },
    select: { userId: true }
  });
  return members.map((member) => member.userId);
}
