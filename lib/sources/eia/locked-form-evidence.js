import {lexicalQualifiers} from './lookup-list.js';
// The approved named part belongs to the product slot. Do not let a shorter
// model quote silently turn it into the whole product at selector construction.
export const quotedNamedParts = topic => lexicalQualifiers(topic.product,topic.quoted_words);
