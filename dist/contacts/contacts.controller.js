"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const contacts_service_1 = require("./contacts.service");
const types_1 = require("../shared/types");
let ContactsController = class ContactsController {
    contacts;
    constructor(contacts) {
        this.contacts = contacts;
    }
    getContacts(channel, externalId) {
        return this.contacts.getContacts(channel, externalId);
    }
    getFriendRequests(channel, externalId) {
        return this.contacts.getFriendRequests(channel, externalId);
    }
    accept(channel, externalId, requestId) {
        return this.contacts.acceptFriendRequest(channel, externalId, requestId);
    }
    decline(channel, externalId, requestId) {
        return this.contacts.declineFriendRequest(channel, externalId, requestId);
    }
    findUser(channel, externalId, phone) {
        return this.contacts.findUser(channel, externalId, phone);
    }
    sendFriendRequest(channel, externalId, body) {
        return this.contacts.sendFriendRequest(channel, externalId, body.userId, body.message ?? '');
    }
    getOrCreateConversation(channel, externalId, body) {
        return this.contacts.getOrCreateConversation(channel, externalId, body.userId, body.displayName, body.avatar ?? null);
    }
};
exports.ContactsController = ContactsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('channel')),
    __param(1, (0, common_1.Param)('externalId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ContactsController.prototype, "getContacts", null);
__decorate([
    (0, common_1.Get)('requests'),
    __param(0, (0, common_1.Param)('channel')),
    __param(1, (0, common_1.Param)('externalId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ContactsController.prototype, "getFriendRequests", null);
__decorate([
    (0, common_1.Post)('requests/:requestId/accept'),
    __param(0, (0, common_1.Param)('channel')),
    __param(1, (0, common_1.Param)('externalId')),
    __param(2, (0, common_1.Param)('requestId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number]),
    __metadata("design:returntype", void 0)
], ContactsController.prototype, "accept", null);
__decorate([
    (0, common_1.Post)('requests/:requestId/decline'),
    __param(0, (0, common_1.Param)('channel')),
    __param(1, (0, common_1.Param)('externalId')),
    __param(2, (0, common_1.Param)('requestId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number]),
    __metadata("design:returntype", void 0)
], ContactsController.prototype, "decline", null);
__decorate([
    (0, common_1.Get)('search/:phone'),
    __param(0, (0, common_1.Param)('channel')),
    __param(1, (0, common_1.Param)('externalId')),
    __param(2, (0, common_1.Param)('phone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ContactsController.prototype, "findUser", null);
__decorate([
    (0, common_1.Post)('add-friend'),
    __param(0, (0, common_1.Param)('channel')),
    __param(1, (0, common_1.Param)('externalId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], ContactsController.prototype, "sendFriendRequest", null);
__decorate([
    (0, common_1.Post)('chat'),
    __param(0, (0, common_1.Param)('channel')),
    __param(1, (0, common_1.Param)('externalId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], ContactsController.prototype, "getOrCreateConversation", null);
exports.ContactsController = ContactsController = __decorate([
    (0, swagger_1.ApiTags)('contacts'),
    (0, swagger_1.ApiBearerAuth)('jwt'),
    (0, common_1.Controller)('bots/:channel/:externalId/contacts'),
    __metadata("design:paramtypes", [contacts_service_1.ContactsService])
], ContactsController);
//# sourceMappingURL=contacts.controller.js.map