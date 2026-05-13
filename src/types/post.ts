export type PostType = 'lost' | 'found';
export type PostStatus = 'pending' | 'approved' | 'rejected' | 'resolved';

export type TimestampLike =
  | Date
  | {
      toDate: () => Date;
    }
  | null;

export interface Post {
  id: string;
  type: PostType;
  title: string;
  description: string;
  category: string;
  location: string;
  imageUrl: string | null;
  userId?: string;
  userName: string;
  userEmail?: string | null;
  createdAt: TimestampLike;
  status: PostStatus | string;
  approvedAt?: TimestampLike;
  approvedBy?: string | null;
  resolvedAt?: TimestampLike;
  resolvedBy?: string | null;
}
