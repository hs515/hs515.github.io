function initializePageBody() {
    document.querySelector('#page_body').innerHTML += initializeNavigator();
    document.querySelector('#page_body').innerHTML += initializeQuestionBody();
    document.querySelector('#page_body').innerHTML += initializeMessage();
    document.querySelector('#page_body').innerHTML += initializeAnswers();
}

function initializeNavigator() {
    let content = '';
    return content;
}

function initializeQuestionBody() {
    let content =
        '<div class="alert alert-info" role="alert">' +
        '    <h3 id="question_banner">Question Description</h3>' +
        '    <form>' +
        '        <label id="question_n1" for="question_n1">1</label>' +
        '        x' +
        '        <label id="question_n2" for="question_n2">1</label>' +
        '        =' +
        '        <input type="number" id="question_answer" placeholder="Answer">' +
        '        <input type="submit" id="question_submit">' +
        '    </form>' +
        '    <h3 id="question_summary">Answers 0/0</h3>' +
        '</div>';
    return content;
}

function initializeMessage() {
    let content =
        '<div id="question_message" class="alert alert-warning" role="alert">' +
        '</div>';
    return content;
}

function initializeAnswers() {
    let content =
        '<div id="question_list">' +
        '</div>';
    return content;
}