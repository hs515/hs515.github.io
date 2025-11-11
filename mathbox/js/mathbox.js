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

    var x = Math.floor(rn * (end - start + 1)) + start;
    return x;
}

function randomSwitch() {
    var rn = Math.floor(Math.random() * 2);
    return (rn === 1);
}

function isNumeric(str) {
    if (typeof str != "string") return false // we only process strings!  
    return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
           !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}