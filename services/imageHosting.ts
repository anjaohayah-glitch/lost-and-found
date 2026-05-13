import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

export const imageHostingConfigured = true;
export const imageHostingLabel = 'device storage (Base64)';
export const IMAGE_HOSTING_SETUP_MESSAGE = '';

interface UploadOptions {
  uri: string;
  postType: string;
  userId: string;
}

export async function uploadPostImage({ uri }: UploadOptions): Promise<string> {
  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 600 } }],
      { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG },
    );

    const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
      encoding: 'base64',
    });

    const dataUri = `data:image/jpeg;base64,${base64}`;

    if (dataUri.length > 900_000) {
      throw new Error('Image is too large. Please choose a smaller photo.');
    }

    return dataUri;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Failed to process image.');
  }
}
