let questionList = new Array();
let numberOfCorrectAnswers = 0;
let questionType = "multi_0";

document.addEventListener('DOMContentLoaded', () => {
    initializePage();
})

function initializePage() {
    initializePageBody();
    initializeEventListeners();
    resetQuestionList();
    createNewQuestion(questionType);
}

function resetQuestionList() {
    numberOfCorrectAnswers = 0;
    questionList = new Array();
}

function initializePageBody() {
    document.querySelector('#page_body').innerHTML = '';
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
        '        <label id="question_formula" for="question_formula">Question Formula</label>' +
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

function createNewQuestion(questionType) {
    let n1 = randomNumberBetween(2, 9, "linear");
    let n2 = randomNumberBetween(4, 9, "linear");
    switch (questionType) {
        case "multi_1":
            n1 = 1;
            break;
        case "multi_2":
            n1 = 2;
            break;
        case "multi_3":
            n1 = 3;
            break;
        case "multi_4":
            n1 = 4;
            break;
        case "multi_5":
            n1 = 5;
            break;
        case "multi_6":
            n1 = 6;
            break;
        case "multi_7":
            n1 = 7;
            break;
        case "multi_8":
            n1 = 8;
            break;
        case "multi_9":
            n1 = 9;
            break;
        case "multi_0":
        default:
            break;
    }
    questionList[questionList.length] = new multiplicationQuestion(n1, n2);
    document.querySelector('#question_formula').innerHTML = questionList[questionList.length - 1].questionFormula();
}

function multiplicationQuestion(number1, number2) {
    this.number1 = number1;
    this.number2 = number2;
    this.expected = number1 * number2;
    this.answer = undefined;

    this.setAnswer = setAnswer;
    function setAnswer(answer) {
        this.answer = answer;
    }

    this.getAnswer = getAnswer;
    function getAnswer() {
        return this.answer;
    }

    this.validateAnswer = validateAnswer;
    function validateAnswer() {
        return (this.expected === this.answer);
    }

    this.questionFormula = questionFormula;
    function questionFormula() {
        return `${this.number1} x ${this.number2} = `;
    }
}

function saveAnswer() {
    if (document.querySelector('#question_answer').value.length > 0) {
        const answer = parseInt(document.querySelector('#question_answer').value);
        questionList[questionList.length - 1].setAnswer(answer);
        updatePageBody();
    } else {
        document.getElementById("question_message").innerHTML = "Please input your answer then submit.";
        document.getElementById("question_message").hidden = false;
    }
}

function updatePageBody() {
    const element = document.createElement('p');
    const cur = questionList[questionList.length - 1];
    element.style.margin = 0;
    let result = cur.validateAnswer();
    numberOfCorrectAnswers += result;
    let mark = result ? "<span class=\"badge badge-success\">T</span>" : "<span class=\"badge badge-danger\">F</span>";
    let danger = result ? "<div class=\"alert alert-success\" role=\"alert\">" : "<div class=\"alert alert-danger\" role=\"alert\">";

    element.innerHTML = `${danger} ${mark} ${cur.questionFormula()} ${cur.getAnswer()} </div>`;
    document.querySelector('#question_list').prepend(element);

    if (questionList.length === 100) {
        document.getElementById("question_message").innerHTML = "Congratulations!!<br>You have completed 100 questions! Show your mom and ask for a treat!";
        document.getElementById("question_message").hidden = false;
    } else {
        document.querySelector('#question_answer').value = "";
        createNewQuestion(questionType);
    
        document.querySelector('#question_summary').innerHTML = `Answers ${numberOfCorrectAnswers}/${questionList.length - 1}`
        document.getElementById("question_message").hidden = true;
    }
}