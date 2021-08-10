/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { GetStaticProps } from 'next';
import Link from 'next/link';
import { FiCalendar, FiUser } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { useState } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import { getPrismicClient } from '../services/prismic';
import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';
import Button from '../components/Button';

interface Post {
  uid?: string;
  first_publication_date?: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  preview: boolean;
  postsPagination: PostPagination;
}

export default function Home({ postsPagination, preview }: HomeProps) {
  const formattedPosts = postsPagination.results.map(post => {
    return {
      ...post,
      first_publication_date: format(
        new Date(post.first_publication_date),
        `dd MMM yyyy`,
        {
          locale: ptBR,
        }
      ),
    };
  });
  const [posts, setPosts] = useState<Post[]>(formattedPosts);
  const [nextPage, setNextPage] = useState(postsPagination.next_page);

  async function handleGetNextPagePosts() {
    const nextPageResponse = await fetch(`${nextPage}`).then(response =>
      response.json()
    );

    const newPagePosts: Post[] = nextPageResponse.results.map(post => {
      return {
        uid: post.uid,
        first_publication_date: format(
          new Date(post.first_publication_date),
          `dd MMM yyyy`,
          {
            locale: ptBR,
          }
        ),
        data: {
          title: post.data.title,
          subtitle: post.data.subtitle,
          author: post.data.author,
        },
      };
    });

    setNextPage(nextPageResponse.next_page);
    setPosts([...posts, ...newPagePosts]);
  }
  return (
    <>
      <Head>
        <title>Inicio | spacetraveling</title>
      </Head>
      <main className={commonStyles.container}>
        <Header />
        <div className={styles.posts}>
          {posts.map(post => (
            <Link href={`/post/${post.uid}`} key={post.uid}>
              <a>
                <h1>{post.data.title}</h1>
                <p>{post.data.subtitle}</p>
                <div>
                  <time>
                    <FiCalendar />
                    {post.first_publication_date}
                  </time>
                  <p>
                    <FiUser />
                    {post.data.author}
                  </p>
                </div>
              </a>
            </Link>
          ))}
          {nextPage && (
            <button type="button" onClick={handleGetNextPagePosts}>
              Carregar mais posts
            </button>
          )}

          <div>
            {preview && (
              <Button>
                <Link href="/api/exit-preview">
                  <a>Sair do modo Preview</a>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['post.title', 'post.content'],
      pageSize: 2,
      ref: previewData?.ref ?? null,
    }
  );
  const { next_page } = postsResponse;

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });
  const postsPagination = {
    next_page,
    results: posts,
  };

  return { props: { postsPagination, preview } };
};
