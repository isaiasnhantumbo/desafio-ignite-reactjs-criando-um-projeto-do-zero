/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { ReactChild } from 'react';
import styles from './button.module.scss';

interface ButtonProps {
  children: ReactChild;
}
export default function Button({ children }: ButtonProps) {
  return (
    <button type="button" className={styles.PreviewButton}>
      {children}
    </button>
  );
}
