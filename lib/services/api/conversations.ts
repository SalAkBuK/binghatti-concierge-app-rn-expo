import { BaseApiService } from "./base";
import { API_ENDPOINTS } from "../../utils/constants";
import type {
  ApiResponse,
  Conversation,
  ConversationDetail,
  ConversationMessage,
  CreateConversationDTO,
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

  async getConversation(id: string): Promise<ApiResponse<ConversationDetail>> {
    return this.get<ApiResponse<ConversationDetail>>(
      API_ENDPOINTS.conversations.detail(id),
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
