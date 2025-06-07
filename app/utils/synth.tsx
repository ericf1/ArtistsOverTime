export default function generate_synthetic_data(
  artistKey: string,
  month: string,
  availableMonths: string[],
  allData: Record<string, Record<string, Record<string, number>>>
) {
  // Base regions (you can expand this list)
  const baseRegions = [
    "new york ny",
    "los angeles ca",
    "chicago il",
    "dallas ft worth tx",
    "philadelphia pa",
    "houston tx",
    "washington dc",
    "miami ft lauderdale fl",
    "atlanta ga",
    "boston ma",
    "phoenix az",
    "detroit mi",
    "seattle tacoma wa",
    "tampa st petersburg fl",
    "minneapolis st paul mn",
    "denver co",
    "cleveland akron canton oh",
    "orlando daytona beach melbourne fl",
    "sacramento stockton modesto ca",
    "pittsburgh pa",
    "st louis mo",
    "baltimore md",
    "charlotte nc",
    "portland or",
    "san antonio tx",
    "nashville tn",
    "milwaukee wi",
    "kansas city mo",
    "columbus oh",
    "greenville spartanburg anderson sc",
    "grand rapids kalamazoo battle creek mi",
  ];

  baseRegions.forEach((region) => {
    // Create different patterns for each artist
    let baseScore = 30 + Math.random() * 40; // 30-70 base

    // Artist-specific modifiers
    if (artistKey === "taylor-swift") {
      // Higher in certain regions, varies by month
      if (
        region.includes("ny") ||
        region.includes("ca") ||
        region.includes("tn")
      ) {
        baseScore += 15;
      }
    } else if (artistKey === "drake") {
      // Higher in urban areas
      if (
        region.includes("ny") ||
        region.includes("chicago") ||
        region.includes("atlanta")
      ) {
        baseScore += 10;
      }
    } else if (artistKey === "bad-bunny") {
      // Higher in areas with Latino populations
      if (
        region.includes("miami") ||
        region.includes("los angeles") ||
        region.includes("houston")
      ) {
        baseScore += 20;
      }
    }

    // Monthly variation
    const monthIndex = availableMonths.indexOf(month);
    const seasonalVariation = Math.sin((monthIndex / 12) * 2 * Math.PI) * 10;
    baseScore += seasonalVariation;

    // Random variation
    baseScore += (Math.random() - 0.5) * 20;

    // Keep in bounds
    allData[artistKey][month][region] = Math.max(20, Math.min(100, baseScore));
  });
  return allData;
}
