import { writable } from 'svelte/store';

export const isEditingQuestion = writable(false);
export const questionsAcross = writable([]);
export const questionsDown = writable([]);