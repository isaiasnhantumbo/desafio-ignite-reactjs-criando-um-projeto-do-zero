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
import Header from '../../components/Header';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
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
  post: Post;
}

export default function Post({ post }: PostProps) {
  const formattedPostDate = format(
    new Date(post.first_publication_date),
    `dd MMM yyyy`,
    {
      locale: ptBR,
    }
  );
  const router = useRouter();
  const isLoading = router.isFallback;

  const totalWordsInPost = post.data.content.reduce((total, contentItem) => {
    total += contentItem.heading.split(' ').length;

    const wordsInBody = contentItem.body.map(
      item => item.text.split(' ').length
    );
    wordsInBody.map(word => (total += word));
    return total;
  }, 0);

  const wordPerMinute = 200;
  const readTime = Math.ceil(totalWordsInPost / wordPerMinute);

  if (isLoading) {
    return <div>Carregando...</div>;
  }

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

export const getStaticProps: GetStaticProps = async context => {
  const { slug } = context.params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  const post = {
    first_publication_date: response.first_publication_date,
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
  // console.log(JSON.stringify(post, null, 2));

  return {
    props: { post },
    revalidate: 60 * 60, // 1 hour
  };
};
