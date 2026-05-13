import { Post, PostType } from '../types/post';

export function getComposerRoute(type: PostType): 'LostPost' | 'FoundPost' {
  return type === 'lost' ? 'LostPost' : 'FoundPost';
}

export function getOppositeType(type: PostType): PostType {
  return type === 'lost' ? 'found' : 'lost';
}

const SAMPLE_POSTS: Record<PostType, Post[]> = {
  lost: [
    {
      id: 'demo-lost-1',
      type: 'lost',
      title: 'Black Samsung phone with cracked case',
      description:
        'Lost near the library charging area after lunch. The lock screen has a corgi wallpaper.',
      category: 'gadget',
      location: 'Library',
      imageUrl: null,
      userId: 'demo-user-1',
      userName: 'Mika',
      userEmail: 'mika@example.com',
      createdAt: new Date(Date.now() - 1000 * 60 * 48),
      status: 'approved',
    },
    {
      id: 'demo-lost-2',
      type: 'lost',
      title: 'Blue notebook with economics notes',
      description:
        'Left behind after a morning class. It has my name written on the inside cover and several sticky tabs.',
      category: 'books',
      location: 'Classroom',
      imageUrl: null,
      userId: 'demo-user-2',
      userName: 'Paolo',
      userEmail: 'paolo@example.com',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
      status: 'approved',
    },
  ],
  found: [
    {
      id: 'demo-found-1',
      type: 'found',
      title: 'Gray water bottle with campus stickers',
      description:
        'Found beside the gym bleachers. Clean bottle with two anime stickers and a black handle.',
      category: 'accessories',
      location: 'Gymnasium',
      imageUrl: null,
      userId: 'demo-user-3',
      userName: 'Ana',
      userEmail: 'ana@example.com',
      createdAt: new Date(Date.now() - 1000 * 60 * 32),
      status: 'approved',
    },
    {
      id: 'demo-found-2',
      type: 'found',
      title: 'Set of keys with fox keychain',
      description:
        'Found on a cafeteria table after the lunch rush. Includes three keys and a small orange fox charm.',
      category: 'keys',
      location: 'Cafeteria',
      imageUrl: null,
      userId: 'demo-user-4',
      userName: 'Jules',
      userEmail: 'jules@example.com',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10),
      status: 'approved',
    },
  ],
};

export function buildMockPosts(type: PostType): Post[] {
  return SAMPLE_POSTS[type].map((post) => ({
    ...post,
    createdAt: post.createdAt instanceof Date ? new Date(post.createdAt.getTime()) : post.createdAt,
  }));
}
