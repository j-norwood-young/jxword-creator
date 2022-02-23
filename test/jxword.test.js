import { render, screen } from '@testing-library/svelte';
import JXWordCreator from '../src/JXWordCreator.svelte';

test("Shows instructions'", () => {
    render(JXWordCreator);
    const node = screen.queryByText("Double-click the question on the right to set an answer.")
    expect(node).not.toBeNull();
})