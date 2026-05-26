async function openCategory(category) {
  categoryTitle.textContent = category.name;

  homeView.classList.add('hidden');
  categoryView.classList.remove('hidden');

  cardGrid.innerHTML = '';
  emptyMessage.classList.add('hidden');

  const { data, error } = await sb
    .from('cards')
    .select('*')
    .eq('category_id', category.id);

  if (error) {
    cardGrid.innerHTML = `
      <p class="error-message">
        Error loading cards: ${escapeHtml(error.message)}
      </p>
    `;

    console.error(error);
    return;
  }

  if (data) {
    data.sort((a, b) => {
      const aNum = Number(a.word);
      const bNum = Number(b.word);

      // If both are valid numbers, sort numerically
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }

      // Otherwise sort alphabetically
      return a.word.localeCompare(b.word);
    });
  }

  if (!data || !data.length) {
    emptyMessage.classList.remove('hidden');
    return;
  }

  data.forEach(card => {
    const tile = document.createElement('button');

    tile.className = 'flashcard-tile';
    tile.type = 'button';

    const imageHtml = card.image_url
      ? `<img src="${escapeAttribute(card.image_url)}" alt="${escapeAttribute(card.word)}" />`
      : `<div class="letter-placeholder">${escapeHtml(card.word)}</div>`;

    tile.innerHTML = `
      <div class="flashcard-image-wrap">
        ${imageHtml}
      </div>

      <strong>${escapeHtml(card.word)}</strong>
    `;

    tile.onclick = () => playCard(card);

    cardGrid.appendChild(tile);
  });
}
