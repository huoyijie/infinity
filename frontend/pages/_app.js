// These styles apply to every route in the application
import '../styles/globals.css';
import { StrictMode } from 'react';

export default function App({ Component, pageProps }) {
  return (
    <StrictMode>
      <Component {...pageProps} />
    </StrictMode>
  );
}