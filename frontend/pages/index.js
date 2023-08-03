import Head from 'next/head';
import WhiteBoard from '../components/WhiteBoard';

export default function Home() {
  return (
    <>
      <Head>
        <title>协作式白板</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <WhiteBoard />
    </>
  );
}