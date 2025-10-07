import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Paths, Directory, File } from "expo-file-system";

export const IMAGE_CONFIG = {
  MAX_WIDTH: 1920,
  MAX_HEIGHT: 1920,
  QUALITY: 0.8,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_ATTACHMENTS: 5,
  ALLOWED_TYPES: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
} as const;

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
  size: number;
}

/**
 * Request camera permissions
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === "granted";
};

/**
 * Request media library permissions
 */
export const requestMediaLibraryPermission = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === "granted";
};

/**
 * Compress and resize image
 */
export const compressImage = async (uri: string): Promise<CompressedImage> => {
  try {
    // Compress and resize
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: IMAGE_CONFIG.MAX_WIDTH,
            height: IMAGE_CONFIG.MAX_HEIGHT,
          },
        },
      ],
      {
        compress: IMAGE_CONFIG.QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );

    // Get compressed file size (approximate based on image dimensions)
    const approxSize =
      (manipulatedImage.width * manipulatedImage.height * 3 * IMAGE_CONFIG.QUALITY) /
      10; // Rough estimate

    return {
      uri: manipulatedImage.uri,
      width: manipulatedImage.width,
      height: manipulatedImage.height,
      size: approxSize,
    };
  } catch (error) {
    console.error("Error compressing image:", error);
    throw new Error("Failed to compress image");
  }
};

/**
 * Pick image from camera
 */
export const pickImageFromCamera = async (): Promise<string | null> => {
  try {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      throw new Error("Camera permission denied");
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images" as any,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];

    // Check file size
    if (asset.fileSize && asset.fileSize > IMAGE_CONFIG.MAX_FILE_SIZE) {
      throw new Error(
        `Image size (${(asset.fileSize / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed size (${IMAGE_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`,
      );
    }

    // Compress image
    const compressed = await compressImage(asset.uri);
    return compressed.uri;
  } catch (error) {
    console.error("Error picking image from camera:", error);
    throw error;
  }
};

/**
 * Pick image from gallery
 */
export const pickImageFromGallery = async (): Promise<string | null> => {
  try {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) {
      throw new Error("Media library permission denied");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images" as any,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];

    // Check file size
    if (asset.fileSize && asset.fileSize > IMAGE_CONFIG.MAX_FILE_SIZE) {
      throw new Error(
        `Image size (${(asset.fileSize / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed size (${IMAGE_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`,
      );
    }

    // Compress image
    const compressed = await compressImage(asset.uri);
    return compressed.uri;
  } catch (error) {
    console.error("Error picking image from gallery:", error);
    throw error;
  }
};

/**
 * Pick multiple images from gallery
 */
export const pickMultipleImagesFromGallery = async (
  maxImages: number = IMAGE_CONFIG.MAX_ATTACHMENTS,
): Promise<string[]> => {
  try {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) {
      throw new Error("Media library permission denied");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images" as any,
      allowsMultipleSelection: true,
      selectionLimit: maxImages,
      quality: 1,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return [];
    }

    const compressedUris: string[] = [];

    for (const asset of result.assets) {
      // Check file size
      if (asset.fileSize && asset.fileSize > IMAGE_CONFIG.MAX_FILE_SIZE) {
        console.warn(
          `Skipping image (${(asset.fileSize / 1024 / 1024).toFixed(1)}MB) - exceeds maximum size`,
        );
        continue;
      }

      try {
        const compressed = await compressImage(asset.uri);
        compressedUris.push(compressed.uri);
      } catch (error) {
        console.error("Error compressing individual image:", error);
        // Continue with other images
      }
    }

    return compressedUris;
  } catch (error) {
    console.error("Error picking multiple images:", error);
    throw error;
  }
};

/**
 * Copy image to app's document directory for persistent storage
 */
export const saveImageToAppDirectory = async (
  uri: string,
  requestId: string,
): Promise<string> => {
  try {
    const filename = `${requestId}_${Date.now()}.jpg`;

    // Create attachments directory in documents
    const attachmentsDir = new Directory(Paths.document, "attachments");

    // Create directory if it doesn't exist
    if (!attachmentsDir.exists) {
      await attachmentsDir.create();
    }

    // Create file reference
    const targetFile = new File(attachmentsDir, filename);

    // Copy file (using source file)
    const sourceFile = new File(uri);
    await sourceFile.copy(targetFile);

    return targetFile.uri;
  } catch (error) {
    console.error("Error saving image to app directory:", error);
    throw new Error("Failed to save image");
  }
};

/**
 * Delete image from app directory
 */
export const deleteImageFromAppDirectory = async (
  uri: string,
): Promise<void> => {
  try {
    const file = new File(uri);
    if (file.exists) {
      await file.delete();
    }
  } catch (error) {
    console.error("Error deleting image:", error);
    // Don't throw - deletion failure shouldn't break the app
  }
};

/**
 * Get file size in human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Validate image file
 */
export const validateImageFile = (
  uri: string,
  size?: number,
): { valid: boolean; error?: string } => {
  if (!uri) {
    return { valid: false, error: "No file selected" };
  }

  if (size && size > IMAGE_CONFIG.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum (${IMAGE_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`,
    };
  }

  return { valid: true };
};
