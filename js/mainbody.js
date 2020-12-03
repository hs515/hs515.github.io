let number = 10;
let numberOfCorrect = 0;
let questions = new Array();

document.addEventListener('DOMContentLoaded', () => {
    initializePage();
})

function initializePage() {
    initializePageBody();
    initializeEventListeners();
    createNewQuestion();
}

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
        '    <h3 id="question_description">Question Description</h3>' +
        '    <form id="question_form">' +
        '        <label id="question_n1" for="question_n1">1</label>' +
        '        x' +
        '        <label id="question_n2" for="question_n2">1</label>' +
        '        =' +
        '        <input type="number" id="question_answer" placeholder="Answer">' +
        '        <input type="submit" id="question_submit">' +
        '    </form>' +
        '</div>' +
        '<div class="alert alert-info" role="alert">' +
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

function initializeEventListeners() {
    document.querySelector('#question_submit').disabled = true;
    document.getElementById("question_message").hidden = true;

    document.querySelector('#question_answer').onkeyup = () => {
        if (document.querySelector('#question_answer').value.length > 0) {
            document.querySelector('#question_submit').disabled = false;
        } else {
            document.querySelector('#question_submit').disabled = true;
        }
    }

    document.querySelector('#question_form').onsubmit = () => {
        const answer = document.querySelector('#question_answer').value;
        console.log(answer);
        saveAnswer();

        // Stop submitting form
        return false;
    }
}

function createNewQuestion() {
    const n1 = randomNumberLessThan(10, "linear");
    const n2 = randomNumberLessThan(10, "sqrt");
    questions[questions.length] = {
        first: n1,
        second: n2,
        answer: undefined
    };
    document.querySelector('#question_n1').innerHTML = n1;
    document.querySelector('#question_n2').innerHTML = n2;
}

function saveAnswer() {
    if (document.querySelector('#question_answer').value.length > 0) {
        const cur = questions[questions.length - 1];
        cur.answer = parseInt(document.querySelector('#question_answer').value);
        const li = document.createElement('p');
        let result = (cur.first * cur.second === cur.answer);
        numberOfCorrect += result;
        let mark = result ? "<span class=\"badge badge-success\">T</span>" : "<span class=\"badge badge-danger\">F</span>";
        let danger = result ? "<div class=\"alert alert-success\" role=\"alert\">" : "<div class=\"alert alert-danger\" role=\"alert\">";

        li.innerHTML = `${danger} ${mark} ${cur.first} x ${cur.second} = ${cur.answer} </div>`;
        document.querySelector('#question_list').prepend(li);

        document.querySelector('#question_answer').value = "";
        createNewQuestion();

        document.querySelector('#question_summary').innerHTML = `Answers ${numberOfCorrect}/${questions.length - 1}`
        document.getElementById("question_message").hidden = true;
    } else {
        document.getElementById("question_message").innerHTML = "Please input your answer then submit.";
        document.getElementById("question_message").hidden = false;
    }
}
