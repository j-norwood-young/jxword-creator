import JXWordCreator from './JXWordCreator.svelte';

const app = new JXWordCreator({
	target: document.body,
	props: {
		name: 'world'
	}
});

export default app;