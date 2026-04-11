import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { formatDate, isImageUri } from "../../../lib/hooks/modals/request-details/request-details-helpers";
import type { RequestDetailsComment } from "../../../lib/hooks/modals/request-details/useRequestDetailsScreen";

type RequestDetailsCommentsProps = {
  comments: RequestDetailsComment[];
  fetchingDetails: boolean;
  newComment: string;
  setNewComment: (value: string) => void;
  isPostingComment: boolean;
  normalizedStatus: string;
  commentsDisabledMessage?: string | null;
  onSubmitComment: () => void;
  styles: Record<string, any>;
};

export function RequestDetailsComments({
  comments,
  fetchingDetails,
  newComment,
  setNewComment,
  isPostingComment,
  normalizedStatus,
  commentsDisabledMessage,
  onSubmitComment,
  styles,
}: RequestDetailsCommentsProps) {
  const commentsDisabled =
    Boolean(commentsDisabledMessage) ||
    normalizedStatus === "cancelled" ||
    normalizedStatus === "completed";

  const placeholder = commentsDisabledMessage
    ? commentsDisabledMessage
    : commentsDisabled
      ? normalizedStatus === "cancelled"
      ? "Comments are disabled for cancelled requests"
      : "Comments are disabled for completed requests"
      : "Share an update or ask a question...";

  return (
    <Animated.View entering={FadeInDown.duration(300)} style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="chatbubbles-outline" size={20} color="#6B7280" />
        <Text style={styles.cardTitle}>Comments</Text>
      </View>

      {fetchingDetails && comments.length === 0 ? (
        <View style={styles.commentsEmpty}>
          <ActivityIndicator color="#2563EB" />
          <Text style={styles.commentsEmptyText}>Loading comments...</Text>
        </View>
      ) : comments.length === 0 ? (
        <View style={styles.commentsEmpty}>
          <Ionicons
            name="chatbox-ellipses-outline"
            size={22}
            color="#9CA3AF"
          />
          <Text style={styles.commentsEmptyText}>No comments yet.</Text>
        </View>
      ) : (
        <View style={styles.commentsList}>
          {comments.map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              <View style={styles.commentHeader}>
                <Ionicons
                  name="person-circle-outline"
                  size={20}
                  color="#6B7280"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.commentAuthor}>{comment.author}</Text>
                  <Text style={styles.commentTime}>
                    {formatDate(comment.createdAt)}
                  </Text>
                </View>
              </View>
              <Text style={styles.commentBody}>{comment.message}</Text>
              {comment.attachments && comment.attachments.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, marginTop: 8 }}
                >
                  {comment.attachments.map((uri, idx) => {
                    const imageAttachment = isImageUri(uri);
                    return (
                      <TouchableOpacity
                        key={`${comment.id}-${idx}`}
                        style={styles.commentAttachment}
                        onPress={() => Linking.openURL(uri)}
                        activeOpacity={0.85}
                      >
                        {imageAttachment ? (
                          <Image
                            source={{ uri }}
                            style={styles.commentAttachmentImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.commentAttachmentPlaceholder}>
                            <Ionicons
                              name="document-outline"
                              size={20}
                              color="#2563EB"
                            />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : null}
            </View>
          ))}
        </View>
      )}

      <View style={styles.commentInputBox}>
        <Text style={styles.commentInputLabel}>Add a comment</Text>
        <TextInput
          style={styles.commentInput}
          placeholder={placeholder}
          value={newComment}
          onChangeText={setNewComment}
          multiline
          editable={!commentsDisabled}
        />
        <TouchableOpacity
          style={[
            styles.commentSendButton,
            (!newComment.trim() || isPostingComment || commentsDisabled) &&
              styles.commentSendButtonDisabled,
          ]}
          onPress={onSubmitComment}
          disabled={!newComment.trim() || isPostingComment || commentsDisabled}
        >
          {isPostingComment ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="send" size={16} color="#FFFFFF" />
              <Text style={styles.commentSendText}>Post Comment</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
