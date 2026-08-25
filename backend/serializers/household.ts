import type {
  PartnerLink as PrismaPartnerLink,
  User as PrismaUser,
} from "@/backend/generated/prisma/client";
import type { PartnerLink } from "@/backend/types";

export function toPartnerLinkDto(
  link: PrismaPartnerLink & { requester: PrismaUser; partner: PrismaUser },
  viewerId: string
): PartnerLink {
  const isRequester = link.requesterId === viewerId;
  const other = isRequester ? link.partner : link.requester;

  return {
    id: link.id,
    status: link.status,
    direction: isRequester ? "sent" : "received",
    otherUser: { id: other.id, email: other.email, name: other.name },
    createdAt: link.createdAt.toISOString(),
  };
}
