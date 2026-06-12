import { Injectable } from '@nestjs/common';
import { Contact, FriendRequest, Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/prisma/prisma.service';

@Injectable()
export class ContactsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Contact ───────────────────────────────────────────────────────

  findManyByBot(botId: number): Promise<Contact[]> {
    return this.prisma.contact.findMany({
      where: { botId },
      orderBy: { name: 'asc' },
    });
  }

  findFirstByBotAndExternalOrId(botId: number, targetUserId: string): Promise<Contact | null> {
    const orConditions: any[] = [{ externalId: targetUserId }];
    if (/^\d+$/.test(targetUserId)) {
      orConditions.push({ id: parseInt(targetUserId, 10) });
    }
    return this.prisma.contact.findFirst({
      where: { botId, OR: orConditions },
    });
  }

  findFirstByBotAndExternal(botId: number, externalId: string): Promise<Contact | null> {
    return this.prisma.contact.findFirst({
      where: { botId, externalId },
    });
  }

  findFirstFriendByBotAndExternal(botId: number, externalId: string): Promise<Contact | null> {
    return this.prisma.contact.findFirst({
      where: { botId, externalId, isFriend: true },
    });
  }

  create(data: Prisma.ContactUncheckedCreateInput): Promise<Contact> {
    return this.prisma.contact.create({ data });
  }

  update(id: number, data: Prisma.ContactUpdateInput): Promise<Contact> {
    return this.prisma.contact.update({ where: { id }, data });
  }

  updateManyByBotAndExternal(botId: number, externalId: string, data: Prisma.ContactUpdateManyMutationInput): Promise<{ count: number }> {
    return this.prisma.contact.updateMany({
      where: { botId, externalId },
      data,
    });
  }

  setAllOfflineByBot(botId: number): Promise<{ count: number }> {
    return this.prisma.contact.updateMany({
      where: { botId, isOnline: true },
      data: { isOnline: false },
    });
  }

  setOnlineByExternalIds(botId: number, externalIds: string[]): Promise<{ count: number }> {
    return this.prisma.contact.updateMany({
      where: { botId, externalId: { in: externalIds } },
      data: { isOnline: true },
    });
  }

  delete(id: number): Promise<Contact> {
    return this.prisma.contact.delete({ where: { id } });
  }

  // ── FriendRequest ─────────────────────────────────────────────────

  findManyRequestsByBot(botId: number): Promise<FriendRequest[]> {
    return this.prisma.friendRequest.findMany({
      where: { botId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findRequestByIdAndBot(requestId: number, botId: number): Promise<FriendRequest | null> {
    return this.prisma.friendRequest.findFirst({
      where: { id: requestId, botId },
    });
  }

  deleteRequest(id: number): Promise<FriendRequest> {
    return this.prisma.friendRequest.delete({ where: { id } });
  }

  // ── Transaction helper ────────────────────────────────────────────

  transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  /** Batch-read contacts by external IDs (used by sync). */
  findManyByExternalIds(botId: number, externalIds: string[]) {
    return this.prisma.contact.findMany({
      where: { botId, externalId: { in: externalIds } },
      select: { externalId: true, name: true, zaloName: true },
    });
  }

  /** Full upsert for contact sync (all fields). */
  upsertContact(input: {
    botId: number;
    externalId: string;
    name: string;
    avatar: string | null;
    phone: string | null;
    cover: string | null;
    gender: number | null;
    dob: string | null;
    signature: string | null;
    zaloName: string | null;
    isFriend: boolean;
  }) {
    return this.prisma.contact.upsert({
      where: { botId_externalId: { botId: input.botId, externalId: input.externalId } },
      create: { ...input },
      update: {
        name: input.name,
        avatar: input.avatar,
        phone: input.phone,
        cover: input.cover,
        gender: input.gender,
        dob: input.dob,
        signature: input.signature,
        zaloName: input.zaloName,
        isFriend: input.isFriend,
      },
    });
  }

  /** Upsert a friend request. */
  upsertRequest(input: { botId: number; externalId: string; name: string; avatar: string | null; source: string }) {
    return this.prisma.friendRequest.upsert({
      where: { botId_externalId: { botId: input.botId, externalId: input.externalId } },
      create: input,
      update: { name: input.name, avatar: input.avatar, source: input.source },
    });
  }

  /** Delete friend requests by IDs. */
  deleteRequestsByIds(ids: number[]) {
    return this.prisma.friendRequest.deleteMany({ where: { id: { in: ids } } });
  }

  /** Find all friend requests for a bot. */
  findAllRequestsByBot(botId: number) {
    return this.prisma.friendRequest.findMany({ where: { botId } });
  }
}
