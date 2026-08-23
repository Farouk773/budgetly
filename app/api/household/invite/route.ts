import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toPartnerLinkDto } from "@/lib/serializers/household";
import { inviteSchema } from "@/lib/validations/household";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  if (parsed.data.email === user.email) {
    return NextResponse.json(
      { error: "Tu ne peux pas t'inviter toi-même" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!target) {
    return NextResponse.json(
      { error: "Aucun compte avec cet email" },
      { status: 404 }
    );
  }

  const existing = await prisma.partnerLink.findFirst({
    where: {
      OR: [
        { requesterId: user.id, partnerId: target.id },
        { requesterId: target.id, partnerId: user.id },
      ],
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Une invitation existe déjà avec ce compte" },
      { status: 409 }
    );
  }

  const link = await prisma.partnerLink.create({
    data: { requesterId: user.id, partnerId: target.id },
    include: { requester: true, partner: true },
  });

  return NextResponse.json(
    { link: toPartnerLinkDto(link, user.id) },
    { status: 201 }
  );
}
