export function saveState(state) {
    let stateString = JSON.stringify(state);
    localStorage.setItem('jxword-creator', stateString);
}

export function restoreState() {
    let stateString = localStorage.getItem('jxword-creator');
    if (stateString) {
        let state = JSON.parse(stateString);
        return state;
    } else {
        return null;
    }
}

export function clearState() {
    localStorage.clear();
}