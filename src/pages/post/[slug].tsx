/* eslint-disable no-param-reassign */
/* eslint-disable no-return-assign */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { RichText } from 'prismic-dom';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Header from '../../components/Header';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Button from '../../components/Button';
import Comments from '../../components/Comment';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  postNavigation: {
    previousPost: {
      uid: string;
      data: {
        title: string;
      };
    }[];
    nextPost: {
      uid: string;
      data: {
        title: string;
      };
    }[];
  };
  preview?: boolean;
  post: Post;
}

export default function Post({ post, postNavigation, preview }: PostProps) {
  const router = useRouter();
  const isLoading = router.isFallback;

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  const formattedPostDate = format(
    new Date(post.first_publication_date),
    `dd MMM yyyy`,
    {
      locale: ptBR,
    }
  );

  const hasPostEdited =
    post.first_publication_date !== post.last_publication_date;

  let formattedPostEditDate: string;
  if (hasPostEdited) {
    formattedPostEditDate = format(
      new Date(post.last_publication_date),
      "'* editado em' dd MMM yyyy 'às,' H:m",
      {
        locale: ptBR,
      }
    );
  }

  let readTime;

  function calculateReadTime() {
    const totalWordsInPost = post.data.content.reduce((total, contentItem) => {
      total += contentItem.heading.split(' ').length;

      const wordsInBody = contentItem.body.map(
        item => item.text.split(' ').length
      );
      wordsInBody.map(word => (total += word));
      return total;
    }, 0);

    const wordPerMinute = 200;

    readTime = Math.ceil(totalWordsInPost / wordPerMinute);
    return readTime;
  }
  calculateReadTime();

  return (
    <>
      <Head>
        <title> {post.data.title} | spacetraveling</title>
      </Head>
      <Header />
      <img
        src={post.data.banner.url}
        alt="banner"
        className={styles.postBanner}
      />
      <main className={commonStyles.container}>
        <div className={styles.post}>
          <div>
            <h1>{post.data.title}</h1>
            <div>
              <time>
                <FiCalendar />
                {formattedPostDate}
              </time>
              <p>
                <FiUser />
                <span>{post.data.author}</span>
              </p>
              <span>
                <FiClock />
                {`${readTime} min`}
              </span>
            </div>
            {hasPostEdited && <i>{formattedPostEditDate}</i>}
          </div>
          {post.data.content.map(content => {
            return (
              <article className={styles.postContent} key={content.heading}>
                <h2>{content.heading}</h2>
                <div
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{
                    __html: RichText.asHtml(content.body),
                  }}
                />
              </article>
            );
          })}
        </div>
        <footer className={`${styles.post} ${styles.footer}`}>
          <section className={styles.postNavigation}>
            {postNavigation?.previousPost.length > 0 && (
              <div>
                <p>{postNavigation.previousPost[0]?.data.title}</p>
                <Link href={`/post/${postNavigation.previousPost[0]?.uid}`}>
                  <a>Post anterior</a>
                </Link>
              </div>
            )}

            {postNavigation?.nextPost.length > 0 && (
              <div>
                <p>{postNavigation.nextPost[0]?.data.title}</p>
                <Link href={`/post/${postNavigation.nextPost[0]?.uid}`}>
                  <a>Proximo post</a>
                </Link>
              </div>
            )}
          </section>
          <Comments />
          {preview && (
            <Button>
              <Link href="/api/exit-preview">
                <a>Sair do modo Preview</a>
              </Link>
            </Button>
          )}
        </footer>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.predicates.at('document.type', 'posts'),
  ]);

  const paths = posts.results.map(post => ({
    params: { slug: post.uid },
  }));

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });
  const previousPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date]',
    }
  );
  const nextPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.last_publication_date desc]',
    }
  );

  const post = {
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    uid: response.uid,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body],
        };
      }),
    },
  };
  return {
    props: {
      post,
      preview,
      postNavigation: {
        previousPost: previousPost?.results,
        nextPost: nextPost?.results,
      },
    },
    revalidate: 60 * 60, // 1 hour
  };
};
