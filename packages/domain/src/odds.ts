const AMERICAN_ODDS_MIN_MAGNITUDE = 100;

export type OddsInput = {
  americanOdds: number;
  label: string;
};

export type NoVigPrice = OddsInput & {
  impliedProbability: number;
  noVigProbability: number;
  noVigAmerican: number;
};

export function assertValidProbability(probability: number, label = "probability") {
  if (!Number.isFinite(probability) || probability <= 0 || probability >= 1) {
    throw new RangeError(`${label} must be greater than 0 and less than 1.`);
  }
}

export function assertValidAmericanOdds(americanOdds: number) {
  if (!Number.isInteger(americanOdds)) {
    throw new RangeError("American odds must be an integer.");
  }

  if (Math.abs(americanOdds) < AMERICAN_ODDS_MIN_MAGNITUDE) {
    throw new RangeError("American odds magnitude must be at least 100.");
  }
}

export function americanToDecimal(americanOdds: number) {
  assertValidAmericanOdds(americanOdds);

  if (americanOdds > 0) {
    return 1 + americanOdds / 100;
  }

  return 1 + 100 / Math.abs(americanOdds);
}

export function decimalToAmerican(decimalOdds: number) {
  if (!Number.isFinite(decimalOdds) || decimalOdds <= 1) {
    throw new RangeError("Decimal odds must be greater than 1.");
  }

  if (decimalOdds >= 2) {
    return Math.round((decimalOdds - 1) * 100);
  }

  return Math.round(-100 / (decimalOdds - 1));
}

export function impliedProbabilityFromAmerican(americanOdds: number) {
  assertValidAmericanOdds(americanOdds);

  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  }

  return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
}

export function fairAmericanLineFromProbability(probability: number) {
  assertValidProbability(probability);

  if (probability < 0.5) {
    return Math.round((100 * (1 - probability)) / probability);
  }

  return Math.round((-100 * probability) / (1 - probability));
}

export function noVigProbabilities(prices: OddsInput[]): NoVigPrice[] {
  if (prices.length < 2) {
    throw new RangeError("At least two prices are required to remove vig.");
  }

  const withImplied = prices.map((price) => ({
    ...price,
    impliedProbability: impliedProbabilityFromAmerican(price.americanOdds),
  }));

  const bookTotal = withImplied.reduce((total, price) => total + price.impliedProbability, 0);

  if (bookTotal <= 1) {
    throw new RangeError("Book total must be greater than 1 to remove vig.");
  }

  return withImplied.map((price) => {
    const noVigProbability = price.impliedProbability / bookTotal;

    return {
      ...price,
      noVigProbability,
      noVigAmerican: fairAmericanLineFromProbability(noVigProbability),
    };
  });
}

export function edgePercentage(modelProbability: number, marketAmericanOdds: number) {
  assertValidProbability(modelProbability, "modelProbability");

  const decimalOdds = americanToDecimal(marketAmericanOdds);
  const expectedReturn = modelProbability * decimalOdds - 1;

  return expectedReturn * 100;
}

export function fractionalKellyStake({
  bankroll,
  modelProbability,
  americanOdds,
  fraction = 0.25,
}: {
  bankroll: number;
  modelProbability: number;
  americanOdds: number;
  fraction?: number;
}) {
  if (!Number.isFinite(bankroll) || bankroll <= 0) {
    throw new RangeError("Bankroll must be greater than 0.");
  }

  assertValidProbability(modelProbability, "modelProbability");

  if (!Number.isFinite(fraction) || fraction <= 0 || fraction > 1) {
    throw new RangeError("Kelly fraction must be greater than 0 and less than or equal to 1.");
  }

  const decimalOdds = americanToDecimal(americanOdds);
  const netOdds = decimalOdds - 1;
  const lossProbability = 1 - modelProbability;
  const kellyFraction = (netOdds * modelProbability - lossProbability) / netOdds;

  return Math.max(0, bankroll * kellyFraction * fraction);
}

export function deadHeatReturn({
  stake,
  americanOdds,
  winners,
  tiedPlayers,
}: {
  stake: number;
  americanOdds: number;
  winners: number;
  tiedPlayers: number;
}) {
  if (!Number.isFinite(stake) || stake <= 0) {
    throw new RangeError("Stake must be greater than 0.");
  }

  if (!Number.isInteger(winners) || winners < 1) {
    throw new RangeError("Winners must be at least 1.");
  }

  if (!Number.isInteger(tiedPlayers) || tiedPlayers < winners) {
    throw new RangeError("Tied players must be greater than or equal to winners.");
  }

  const winningStake = (stake * winners) / tiedPlayers;
  const profit = winningStake * (americanToDecimal(americanOdds) - 1);

  return winningStake + profit;
}

export function eachWayReturn({
  stake,
  winAmericanOdds,
  placeFraction,
  placed,
  won,
}: {
  stake: number;
  winAmericanOdds: number;
  placeFraction: number;
  placed: boolean;
  won: boolean;
}) {
  if (!Number.isFinite(stake) || stake <= 0) {
    throw new RangeError("Stake must be greater than 0.");
  }

  if (!Number.isFinite(placeFraction) || placeFraction <= 0 || placeFraction >= 1) {
    throw new RangeError("Place fraction must be greater than 0 and less than 1.");
  }

  const winStake = stake / 2;
  const placeStake = stake / 2;
  const winReturn = won ? winStake * americanToDecimal(winAmericanOdds) : 0;
  const placeAmerican = fairAmericanLineFromProbability(
    impliedProbabilityFromAmerican(winAmericanOdds) / placeFraction,
  );
  const placeReturn = placed ? placeStake * americanToDecimal(placeAmerican) : 0;

  return winReturn + placeReturn;
}
