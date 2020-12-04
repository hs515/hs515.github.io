function randomNumberLessThan(number, mode) {
    var rn = Math.random();
    if (mode === "sqrt") {
        rn = Math.sqrt(rn);
    }
    var x = Math.floor(rn * number);
    return x;
}

function randomNumberBetween(start, end, mode) {
    var rn = Math.random();
    if (mode === "sqrt") {
        rn = Math.sqrt(rn);
    }

    var x = Math.floor(rn * (end - start)) + start;
    return x;
}