function takeWhile(arr: any, pred: Function): any[] {
    let idx = 0;
    while (pred(arr[idx])) {
        idx++;
    }
    return arr.slice(0, idx);
}

export { takeWhile };