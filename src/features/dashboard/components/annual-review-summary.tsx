'use client';
import type {ReactNode} from 'react';
import {Button} from '@/components/ui/button';
import styles from './annual-plan.module.css';

/** The review summary from the current AnnualJourneyWorkspace, shared with data adapters. */
export function AnnualReviewSummary({title,description,actionLabel,onReview,disabled,children}:{title:string;description:string;actionLabel:string;onReview:()=>void;disabled:boolean;children?:ReactNode}){
 return <section className={styles.summary}><div><h2>{title}</h2><p>{description}</p></div>{children}<Button disabled={disabled} onClick={onReview}>{actionLabel}</Button></section>;
}
