import { getCollection } from "astro:content";
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
  if (published.length > 0) {
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

  const localPosts = await getCollection("blog");
  return sortNewestFirst(
    localPosts.map((post) => ({
      slug: post.id,
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate.toISOString().slice(0, 10),
      author: post.data.author,
      image: {
        url:
          typeof post.data.image.url === "string"
            ? post.data.image.url
            : post.data.image.url.src,
        alt: post.data.image.alt,
      },
      tags: post.data.tags,
    })),
  );
}
