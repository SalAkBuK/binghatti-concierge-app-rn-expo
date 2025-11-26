import type { AnnouncementPriority, AnnouncementTargetType } from "../../../lib/types";

export type TabType = "announcements" | "templates";

export interface ComposeFormData {
  title: string;
  body: string;
  priority: AnnouncementPriority;
  targetType: AnnouncementTargetType;
  targetBuildingIds: string[];
  scheduledFor: string;
  templateId: string;
}

export interface RecipientPreviewData {
  count: number;
  buildings: {
    buildingId: string;
    buildingName: string;
    recipientCount: number;
  }[];
}
