import { BaseApiService } from "./base";
import { API_ENDPOINTS } from "../../utils/constants";
import type {
  ApiResponse,
  Conversation,
  ConversationDetail,
  ConversationMessage,
  CreateConversationDTO,
  CreateResidentConversationDTO,
  ResidentManagementContact,
  SendMessageDTO,
} from "../../types";

export class ConversationsApiService extends BaseApiService {
  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    return this.get<ApiResponse<Conversation[]>>(
      API_ENDPOINTS.conversations.list,
    );
  }

  async createConversation(
    data: CreateConversationDTO,
  ): Promise<ApiResponse<Conversation>> {
    return this.post<ApiResponse<Conversation>>(
      API_ENDPOINTS.conversations.create,
      data,
    );
  }

  async createResidentManagementConversation(
    data: CreateResidentConversationDTO,
  ): Promise<ApiResponse<Conversation>> {
    return this.post<ApiResponse<Conversation>>(
      API_ENDPOINTS.conversations.createResidentManagement,
      data,
    );
  }

  async getResidentManagementContacts(): Promise<ApiResponse<ResidentManagementContact[]>> {
    return this.get<ApiResponse<ResidentManagementContact[]>>(
      API_ENDPOINTS.conversations.residentManagementContacts,
    );
  }

  async createResidentOwnerConversation(
    data: CreateResidentConversationDTO,
  ): Promise<ApiResponse<Conversation>> {
    return this.post<ApiResponse<Conversation>>(
      API_ENDPOINTS.conversations.createResidentOwner,
      data,
    );
  }

  async getConversation(id: string): Promise<ApiResponse<ConversationDetail>> {
    return this.get<ApiResponse<ConversationDetail>>(
      API_ENDPOINTS.conversations.detail(id),
    );
  }

  async getUnreadCount(): Promise<ApiResponse<{ unreadCount: number }>> {
    return this.get<ApiResponse<{ unreadCount: number }>>(
      API_ENDPOINTS.conversations.unreadCount,
    );
  }

  async sendMessage(
    conversationId: string,
    data: SendMessageDTO,
  ): Promise<ApiResponse<ConversationMessage>> {
    return this.post<ApiResponse<ConversationMessage>>(
      API_ENDPOINTS.conversations.sendMessage(conversationId),
      data,
    );
  }

  async markAsRead(conversationId: string): Promise<ApiResponse> {
    return this.post<ApiResponse>(
      API_ENDPOINTS.conversations.markRead(conversationId),
    );
  }
}
