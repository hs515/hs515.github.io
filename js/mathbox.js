function randomNumberLessThan(n, mode) {
    var x = 0;
    if (mode === "linear") {
        x = Math.floor(Math.random() * n);
    } else {
        x = Math.floor(Math.sqrt(Math.random()) * n);
    }
    return x;
}
