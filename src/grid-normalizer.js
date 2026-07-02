const legacyRoundKeys = {
  jeopardy: "round1",
  doubleJeopardy: "round2"
};

export function normalizeGridPack(pack) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    return null;
  }

  return {
    id: pack.id,
    name: pack.name,
    rounds: {
      round1: normalizeRound(pack.rounds?.round1 ?? pack.round1 ?? pack.jeopardy),
      round2: normalizeRound(pack.rounds?.round2 ?? pack.round2 ?? pack.doubleJeopardy),
      final: normalizeFinalRound(pack.rounds?.final ?? pack.final ?? pack.faceAFace ?? pack.finalJeopardy)
    }
  };
}

export function normalizeGridForStorage(pack) {
  return stripAnsweredTracking(normalizeGridPack(pack));
}

export function stripAnsweredTracking(grid) {
  if (!grid) {
    return grid;
  }

  const cleanGrid = JSON.parse(JSON.stringify(grid));

  ["round1", "round2"].forEach((roundKey) => {
    cleanGrid.rounds?.[roundKey]?.categories?.forEach((category) => {
      category.prompts?.forEach((prompt) => {
        delete prompt.answered;
      });
    });
  });

  return cleanGrid;
}

export function getLegacyRoundKey(roundKey) {
  return Object.entries(legacyRoundKeys).find(([, value]) => value === roundKey)?.[0] || roundKey;
}

function normalizeRound(round) {
  const categories = round?.categories ?? round?.grid ?? round?.board ?? [];

  return {
    categories: Array.isArray(categories)
      ? categories.map(normalizeCategory)
      : []
  };
}

function normalizeCategory(category) {
  return {
    category: category?.category ?? category?.name ?? "",
    prompts: Array.isArray(category?.prompts ?? category?.questions)
      ? (category.prompts ?? category.questions).map(normalizePrompt)
      : []
  };
}

function normalizePrompt(prompt) {
  const isRiskTile = prompt?.type === "risk" || prompt?.riskTile === true || prompt?.dailyDouble === true;

  return {
    value: Number(prompt?.value),
    prompt: prompt?.prompt ?? prompt?.clue ?? "",
    guessAnswer: prompt?.guessAnswer ?? prompt?.answer ?? "",
    image: prompt?.image,
    type: isRiskTile ? "risk" : prompt?.type,
    answered: Boolean(prompt?.answered)
  };
}

function normalizeFinalRound(finalRound) {
  if (!finalRound || typeof finalRound !== "object") {
    return null;
  }

  return {
    category: finalRound.category ?? "",
    prompt: finalRound.prompt ?? finalRound.clue ?? "",
    guessAnswer: finalRound.guessAnswer ?? finalRound.answer ?? "",
    image: finalRound.image
  };
}
