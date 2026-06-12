/**
 * Type definitions for zca-js API surface.
 * Based on actual usage patterns in zalo-zca.service.ts.
 * Extend as new zca-js methods are used.
 */

// ── Core API instance ────────────────────────────────────────────────

export interface ZaloAPI {
  // Account
  fetchAccountInfo(): Promise<ZaloAccountInfo>;
  getUid?(): string;
  updateProfile(data: { profile: { name: string; dob: string; gender: number } }): Promise<unknown>;
  updateProfileBio?(bio: string): Promise<unknown>;
  changeAccountAvatar?(attachment: unknown): Promise<unknown>;

  // Friends
  getAllFriends?(): Promise<ZaloFriendInfo[]>;
  getFriendOnlines?(): Promise<{ onlines?: Array<{ userId: string; status: string }> }>;
  getFriendRecommendations?(): Promise<ZaloFriendRequest[]>;
  getSentFriendRequest?(): Promise<ZaloFriendRequest[]>;
  getUserInfo(userId: string): Promise<ZaloUserInfo>;
  findUser?(phone: string): Promise<ZaloFindUserResult>;
  sendFriendRequest?(userId: string, message: string): Promise<boolean>;
  acceptFriendRequest?(userId: string): Promise<unknown>;
  rejectFriendRequest?(userId: string): Promise<unknown>;
  undoFriendRequest?(userId: string): Promise<unknown>;
  removeFriend?(userId: string): Promise<unknown>;
  changeFriendAlias?(alias: string, friendId: string): Promise<unknown>;
  removeFriendAlias?(friendId: string): Promise<unknown>;
  getLastOnline?(uid: string): Promise<ZaloLastOnlineResult>;

  // Groups
  getAllGroups?(): Promise<string[]>;
  getGroupInfo(groupId: string): Promise<ZaloGroupData>;
  getGroupMembersInfo?(memberIds: string[]): Promise<{ profiles: Record<string, ZaloMemberProfile> }>;
  getGroupChatHistory?(groupId: string, count: number): Promise<ZaloGroupChatHistory>;
  createGroup?(options: { name: string; members: string[]; avatarSource?: unknown }): Promise<{ groupId: string }>;
  leaveGroup?(groupId: string): Promise<unknown>;
  disperseGroup?(groupId: string): Promise<unknown>;
  removeUserFromGroup?(groupId: string, userId: string): Promise<unknown>;
  inviteUserToGroups?(groupId: string, userId: string): Promise<unknown>;
  changeGroupOwner?(groupId: string, userId: string): Promise<unknown>;
  addGroupDeputy?(groupId: string, userId: string): Promise<unknown>;
  removeGroupDeputy?(groupId: string, userId: string): Promise<unknown>;
  getPendingGroupMembers?(groupId: string): Promise<unknown>;
  reviewPendingMemberRequest?(groupId: string, options: { members: string; isApprove: boolean }): Promise<unknown>;
  updateGroupSettings?(groupId: string, settings: Record<string, unknown>): Promise<unknown>;
  changeGroupName?(groupId: string, name: string): Promise<unknown>;
  changeGroupAvatar?(groupId: string, avatar: string): Promise<unknown>;

  // Messaging
  sendMessage(message: ZaloSendMessagePayload, threadType: number): Promise<unknown>;
  forwardMessage?(payload: ZaloForwardPayload, targetThreadIds: string[], targetThreadType: number): Promise<unknown>;
  sendSeenEvent?(msgParams: unknown, threadType: number): Promise<unknown>;
  sendDeliveredEvent?(isMe: boolean, msgParams: unknown, threadType: number): Promise<unknown>;
  addReaction?(msgParams: ZaloReactionParams, threadType: number): Promise<unknown>;
  undo?(msgParams: ZaloUndoParams, threadType: number): Promise<unknown>;

  // Typing
  sendTypingEvent?(threadId: string, threadType: number, isTyping: boolean): Promise<unknown>;

  // Pins / Board
  pinMessage?(params: ZaloPinParams, threadType: number): Promise<unknown>;
  unpinMessage?(params: ZaloUnpinParams): Promise<unknown>;
  getListBoard?(threadId: string, threadType: number, offset?: number, count?: number): Promise<unknown>;
  getFriendBoardList?(friendId: string, offset?: number, count?: number): Promise<unknown>;

  // Stickers
  getStickers?(keyword?: string): Promise<unknown[]>;

  // Mute
  setMute?(threadId: string, threadType: number, isMuted: boolean): Promise<unknown>;
}

// ── Data types ────────────────────────────────────────────────────────

export interface ZaloAccountInfo {
  profile?: {
    displayName?: string;
    zaloName?: string;
    avatar?: string;
    status?: string;
    gender?: number;
    sdob?: string;
    dob?: string;
  };
}

export interface ZaloFriendInfo {
  userId: string;
  displayName?: string;
  zaloName?: string;
  username?: string;
  avatar?: string;
  phoneNumber?: string;
  cover?: string;
  gender?: number;
  sdob?: string;
  dob?: string;
  status?: string;
}

export interface ZaloFriendRequest {
  userId: string;
  displayName: string;
  avatar?: string;
  message?: string;
}

export interface ZaloUserInfo {
  displayName?: string;
  zaloName?: string;
  avatar?: string;
  uid?: string;
}

export interface ZaloFindUserResult {
  uid: string;
  zalo_name: string;
  display_name: string;
  avatar?: string;
}

export interface ZaloLastOnlineResult {
  online: boolean;
  lastOnline: number | null;
}

export interface ZaloGroupData {
  name: string;
  avt: string | null;
  totalMember: number;
  creatorId?: string;
  adminIds?: string[];
  setting?: Record<string, unknown>;
  currentMems?: ZaloMemberProfile[];
  memVerList?: string[];
}

export interface ZaloMemberProfile {
  id: string;
  dName?: string;
  zaloName?: string;
  displayName?: string;
  avatar?: string;
}

export interface ZaloGroupChatHistory {
  groupMsgs?: ZaloGroupMsg[];
}

export interface ZaloGroupMsg {
  gMsgID?: number | string;
  cMsgID?: number | string;
  msgType?: string;
  content?: string;
  [key: string]: unknown;
}

// ── Message payload types ─────────────────────────────────────────────

export interface ZaloSendMessagePayload {
  message: string;
  attachments?: unknown[];
  mentions?: string[];
  quote?: { messageExternalId?: string; text?: string };
  [key: string]: unknown;
}

export interface ZaloForwardPayload {
  text: string;
  reference?: {
    id: string;
    ts: number;
    logSrcType: number;
    fwLvl: number;
  };
  [key: string]: unknown;
}

export interface ZaloReactionParams {
  messageExternalId: string;
  reaction: string;
  [key: string]: unknown;
}

export interface ZaloUndoParams {
  messageExternalId: string;
  [key: string]: unknown;
}

export interface ZaloPinParams {
  topicId?: string;
  messageExternalId?: string;
  params?: unknown;
  [key: string]: unknown;
}

export interface ZaloUnpinParams {
  topicId: string;
  [key: string]: unknown;
}

// ── Login types ────────────────────────────────────────────────────────

export interface ZaloLoginResult {
  cookie: unknown;
  imei: string;
  userAgent: string;
}

export interface ZaloQRCallback {
  type: number; // 0=generated, 1=expired, 2=scanned, 3=declined, 4=success
  data?: {
    display_name?: string;
    avatar?: string;
    cookie?: unknown;
    imei?: string;
    userAgent?: string;
    code?: number;
  };
  actions?: {
    saveToFile(path: string): Promise<void>;
  };
}
