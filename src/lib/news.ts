import { dal } from "./dal/index.ts";

export interface NewsItem {
  slug: string;
  title: string;
  description: string;
  pubDate: string;
  author: string | null;
  image?: { url: string; alt: string };
  tags: string[];
}

function sortNewestFirst(posts: NewsItem[]): NewsItem[] {
  return posts.sort((a, b) => b.pubDate.localeCompare(a.pubDate));
}

export async function getNewsItems(): Promise<NewsItem[]> {
  const published = await dal.posts.getPublished();
  return sortNewestFirst(
    published.map((post) => ({
      slug: post.slug,
      title: post.title,
      description: post.description,
      pubDate: post.pubDate?.toISOString().slice(0, 10) ?? "",
      author: post.author,
      image: post.coverUrl
        ? { url: post.coverUrl, alt: post.title }
        : undefined,
      tags: post.tags.map((tag) => tag.name),
    })),
  );
}
