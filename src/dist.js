import JXWordCreator from './JXWordCreator.svelte';

export default function (target, props) {
    return new JXWordCreator({
        target,
        props
    });
}