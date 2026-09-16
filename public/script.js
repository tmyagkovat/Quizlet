(() => {
  checkSession();

  const cards = window.studyCards;
  const studyCard = document.querySelector('#study-card');

  if (!studyCard || !Array.isArray(cards) || cards.length === 0) {
    return;
  }

  let current = 0;
  const question = document.querySelector('#question');
  const answer = document.querySelector('#answer');
  const progress = document.querySelector('#progress');
  const flipButton = document.querySelector('#flip');
  const previousButton = document.querySelector('#previous');
  const nextButton = document.querySelector('#next');

  function renderCard() {
    question.textContent = cards[current].question;
    answer.textContent = cards[current].answer;
    progress.textContent = `${current + 1} / ${cards.length}`;
    studyCard.classList.remove('is-flipped');
    flipButton.textContent = 'Показать ответ';
  }

  function toggleFlip() {
    studyCard.classList.toggle('is-flipped');
    flipButton.textContent = studyCard.classList.contains('is-flipped')
      ? 'Показать вопрос'
      : 'Показать ответ';
  }

  function showPreviousCard() {
    current = (current - 1 + cards.length) % cards.length;
    renderCard();
  }

  function showNextCard() {
    current = (current + 1) % cards.length;
    renderCard();
  }

  studyCard.addEventListener('click', toggleFlip);
  studyCard.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    toggleFlip();
  });
  flipButton.addEventListener('click', toggleFlip);
  previousButton.addEventListener('click', showPreviousCard);
  nextButton.addEventListener('click', showNextCard);
})();

async function checkSession() {
  try {
    const response = await fetch('/api/session');
    const data = await response.json();

    if (data.authenticated) {
      console.log(
        `%c[Сессия] Активна. ID пользователя: ${data.userId}`,
        'color: #8aab32; font-weight: bold;'
      );
    } else {
      console.log(
        '%c[Сессия] Завершена или отсутствует. Пользователь не авторизован.',
        'color: #ff806d; font-weight: bold;'
      );
    }
  } catch (error) {
    console.warn('[Сессия] Не удалось проверить состояние сессии.', error);
  }
}
