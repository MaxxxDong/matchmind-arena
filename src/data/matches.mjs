const GROUP_STAGE_SOURCE = `
wc-2026-001-mexico-south-africa|1|Group A|2026-06-11T19:00:00.000Z|Mexico|South Africa|7740|1891|369
wc-2026-002-south-korea-czech-republic|2|Group A|2026-06-12T02:00:00.000Z|South Korea|Czech Republic|4062|2689|3249
wc-2026-003-canada-bosnia-and-herzegovina|3|Group B|2026-06-12T19:00:00.000Z|Canada|Bosnia & Herzegovina|4755|2527|2718
wc-2026-004-united-states-paraguay|4|Group D|2026-06-13T01:00:00.000Z|United States|Paraguay|6442|2157|1401
wc-2026-005-haiti-scotland|5|Group C|2026-06-14T01:00:00.000Z|Haiti|Scotland|1311|2133|6556
wc-2026-006-australia-turkey|6|Group D|2026-06-14T04:00:00.000Z|Australia|Turkey|1311|2133|6556
wc-2026-007-brazil-morocco|7|Group C|2026-06-13T22:00:00.000Z|Brazil|Morocco|6867|2069|1064
wc-2026-008-qatar-switzerland|8|Group B|2026-06-13T19:00:00.000Z|Qatar|Switzerland|338|1883|7779
wc-2026-009-ivory-coast-ecuador|9|Group E|2026-06-14T23:00:00.000Z|Ivory Coast|Ecuador|1760|2255|5985
wc-2026-010-germany-curacao|10|Group E|2026-06-14T17:00:00.000Z|Germany|Curaçao|8102|1819|79
wc-2026-011-netherlands-japan|11|Group F|2026-06-14T20:00:00.000Z|Netherlands|Japan|5049|2461|2490
wc-2026-012-sweden-tunisia|12|Group F|2026-06-15T02:00:00.000Z|Sweden|Tunisia|6106|2229|1665
wc-2026-013-saudi-arabia-uruguay|13|Group H|2026-06-15T22:00:00.000Z|Saudi Arabia|Uruguay|369|1891|7740
wc-2026-014-spain-cape-verde|14|Group H|2026-06-15T16:00:00.000Z|Spain|Cape Verde|8170|1806|24
wc-2026-015-iran-new-zealand|15|Group G|2026-06-16T01:00:00.000Z|Iran|New Zealand|5775|2300|1925
wc-2026-016-belgium-egypt|16|Group G|2026-06-15T19:00:00.000Z|Belgium|Egypt|6956|2050|994
wc-2026-017-france-senegal|17|Group I|2026-06-16T19:00:00.000Z|France|Senegal|7820|1875|305
wc-2026-018-iraq-norway|18|Group I|2026-06-16T22:00:00.000Z|Iraq|Norway|141|1834|8025
wc-2026-019-argentina-algeria|19|Group J|2026-06-17T01:00:00.000Z|Argentina|Algeria|8021|1835|144
wc-2026-020-austria-jordan|20|Group J|2026-06-17T04:00:00.000Z|Austria|Jordan|7364|1967|669
wc-2026-021-ghana-panama|21|Group L|2026-06-17T23:00:00.000Z|Ghana|Panama|6556|2133|1311
wc-2026-022-england-croatia|22|Group L|2026-06-17T20:00:00.000Z|England|Croatia|7488|1942|570
wc-2026-023-portugal-dr-congo|23|Group K|2026-06-17T17:00:00.000Z|Portugal|DR Congo|8151|1810|39
wc-2026-024-uzbekistan-colombia|24|Group K|2026-06-18T02:00:00.000Z|Uzbekistan|Colombia|226|1856|7918
wc-2026-025-czech-republic-south-africa|25|Group A|2026-06-18T16:00:00.000Z|Czech Republic|South Africa|6240|2200|1560
wc-2026-026-switzerland-bosnia-and-herzegovina|26|Group B|2026-06-18T19:00:00.000Z|Switzerland|Bosnia & Herzegovina|6733|2096|1171
wc-2026-027-canada-qatar|27|Group B|2026-06-18T22:00:00.000Z|Canada|Qatar|6956|2050|994
wc-2026-028-mexico-south-korea|28|Group A|2026-06-19T01:00:00.000Z|Mexico|South Korea|6312|2185|1503
wc-2026-029-brazil-haiti|29|Group C|2026-06-20T01:00:00.000Z|Brazil|Haiti|8146|1811|43
wc-2026-030-scotland-morocco|30|Group C|2026-06-19T22:00:00.000Z|Scotland|Morocco|1163|2094|6743
wc-2026-031-turkey-paraguay|31|Group D|2026-06-20T03:00:00.000Z|Turkey|Paraguay|5775|2300|1925
wc-2026-032-united-states-australia|32|Group D|2026-06-19T19:00:00.000Z|United States|Australia|7050|2031|919
wc-2026-033-germany-ivory-coast|33|Group E|2026-06-20T20:00:00.000Z|Germany|Ivory Coast|7732|1893|375
wc-2026-034-ecuador-curacao|34|Group E|2026-06-21T00:00:00.000Z|Ecuador|Curaçao|7640|1911|449
wc-2026-035-netherlands-sweden|35|Group F|2026-06-20T17:00:00.000Z|Netherlands|Sweden|6928|2056|1016
wc-2026-036-tunisia-japan|36|Group F|2026-06-21T04:00:00.000Z|Tunisia|Japan|604|1950|7446
wc-2026-037-uruguay-cape-verde|37|Group H|2026-06-21T22:00:00.000Z|Uruguay|Cape Verde|7740|1891|369
wc-2026-038-spain-saudi-arabia|38|Group H|2026-06-21T16:00:00.000Z|Spain|Saudi Arabia|8170|1806|24
wc-2026-039-belgium-iran|39|Group G|2026-06-21T19:00:00.000Z|Belgium|Iran|7407|1958|635
wc-2026-040-new-zealand-egypt|40|Group G|2026-06-22T01:00:00.000Z|New Zealand|Egypt|1311|2133|6556
wc-2026-041-norway-senegal|41|Group I|2026-06-23T00:00:00.000Z|Norway|Senegal|6375|2171|1454
wc-2026-042-france-iraq|42|Group I|2026-06-22T21:00:00.000Z|France|Iraq|8169|1806|25
wc-2026-043-argentina-austria|43|Group J|2026-06-22T17:00:00.000Z|Argentina|Austria|7577|1924|499
wc-2026-044-jordan-algeria|44|Group J|2026-06-23T03:00:00.000Z|Jordan|Algeria|1925|2300|5775
wc-2026-045-england-ghana|45|Group L|2026-06-23T20:00:00.000Z|England|Ghana|7977|1844|179
wc-2026-046-panama-croatia|46|Group L|2026-06-23T23:00:00.000Z|Panama|Croatia|449|1911|7640
wc-2026-047-portugal-uzbekistan|47|Group K|2026-06-23T17:00:00.000Z|Portugal|Uzbekistan|8151|1810|39
wc-2026-048-colombia-dr-congo|48|Group K|2026-06-24T02:00:00.000Z|Colombia|DR Congo|7918|1856|226
wc-2026-049-scotland-brazil|49|Group C|2026-06-24T22:00:00.000Z|Scotland|Brazil|212|1852|7936
wc-2026-050-morocco-haiti|50|Group C|2026-06-24T22:00:00.000Z|Morocco|Haiti|7862|1867|271
wc-2026-051-switzerland-canada|51|Group B|2026-06-24T19:00:00.000Z|Switzerland|Canada|5929|2267|1804
wc-2026-052-bosnia-and-herzegovina-qatar|52|Group B|2026-06-24T19:00:00.000Z|Bosnia & Herzegovina|Qatar|6240|2200|1560
wc-2026-053-czech-republic-mexico|53|Group A|2026-06-25T01:00:00.000Z|Czech Republic|Mexico|1261|2120|6619
wc-2026-054-south-africa-south-korea|54|Group A|2026-06-25T01:00:00.000Z|South Africa|South Korea|1311|2133|6556
wc-2026-055-curacao-ivory-coast|55|Group E|2026-06-25T20:00:00.000Z|Curaçao|Ivory Coast|1311|2133|6556
wc-2026-056-ecuador-germany|56|Group E|2026-06-25T20:00:00.000Z|Ecuador|Germany|1122|2083|6795
wc-2026-057-japan-sweden|57|Group F|2026-06-25T23:00:00.000Z|Japan|Sweden|5968|2258|1774
wc-2026-058-tunisia-netherlands|58|Group F|2026-06-25T23:00:00.000Z|Tunisia|Netherlands|312|1877|7811
wc-2026-059-turkey-united-states|59|Group D|2026-06-26T02:00:00.000Z|Turkey|United States|2925|2589|4486
wc-2026-060-paraguay-australia|60|Group D|2026-06-26T02:00:00.000Z|Paraguay|Australia|4656|2550|2794
wc-2026-061-norway-france|61|Group I|2026-06-26T19:00:00.000Z|Norway|France|1156|2092|6752
wc-2026-062-senegal-iraq|62|Group I|2026-06-26T19:00:00.000Z|Senegal|Iraq|7482|1943|575
wc-2026-063-egypt-iran|63|Group G|2026-06-27T03:00:00.000Z|Egypt|Iran|4656|2550|2794
wc-2026-064-new-zealand-belgium|64|Group G|2026-06-27T03:00:00.000Z|New Zealand|Belgium|226|1856|7918
wc-2026-065-cape-verde-saudi-arabia|65|Group H|2026-06-27T00:00:00.000Z|Cape Verde|Saudi Arabia|3600|2800|3600
wc-2026-066-uruguay-spain|66|Group H|2026-06-27T00:00:00.000Z|Uruguay|Spain|469|1916|7615
wc-2026-067-panama-england|67|Group L|2026-06-27T21:00:00.000Z|Panama|England|37|1809|8154
wc-2026-068-croatia-ghana|68|Group L|2026-06-27T21:00:00.000Z|Croatia|Ghana|5985|2255|1760
wc-2026-069-algeria-austria|69|Group J|2026-06-28T02:00:00.000Z|Algeria|Austria|1665|2229|6106
wc-2026-070-jordan-argentina|70|Group J|2026-06-28T02:00:00.000Z|Jordan|Argentina|49|1812|8139
wc-2026-071-colombia-portugal|71|Group K|2026-06-27T23:30:00.000Z|Colombia|Portugal|1144|2089|6767
wc-2026-072-dr-congo-uzbekistan|72|Group K|2026-06-27T23:30:00.000Z|DR Congo|Uzbekistan|3600|2800|3600
`;

function marketDimensions(home, away, group) {
  return [
    {
      id: "match_winner_1x2",
      label: "90-minute winner",
      polymarketType: "SPORTS_MARKET_TYPE_MONEYLINE",
      outcomes: [home, "Draw", away],
      format: "basis_points_sum_10000",
      scoreableOnchain: true,
    },
    {
      id: "exact_score",
      label: "Exact score",
      polymarketType: "correct_score",
      outcomes: ["0-0", "1-0", "1-1", "2-0", "2-1", "2-2", "other"],
      format: "ranked_outcomes_with_probability_bps",
    },
    {
      id: "first_goal",
      label: "First goal",
      polymarketType: "sports_prop",
      outcomes: [home, "No goal", away],
      format: "basis_points_sum_10000",
    },
    {
      id: "both_teams_to_score",
      label: "Both teams to score",
      polymarketType: "sports_prop",
      outcomes: ["Yes", "No"],
      format: "basis_points_sum_10000",
    },
    {
      id: "total_goals_2_5",
      label: "Total goals 2.5",
      polymarketType: "SPORTS_MARKET_TYPE_TOTAL",
      line: 2.5,
      outcomes: ["Over", "Under"],
      format: "basis_points_sum_10000",
    },
  ];
}

const DEMO_MATCHES = [
  {
    id: "demo-replay:argentina-france-2022",
    title: "Argentina vs France",
    subtitle: "World Cup final replay",
    stage: "Demo replay",
    kickoff: "Replay window",
    venue: "Lusail signal pack",
    status: "AI benchmark ready",
    bias: "Volatile late-game momentum",
    scoringMode: "demo-replay",
    signalWindow: "Historical replay signals are accepted only for explicitly labeled demo scoring.",
    window: 4,
    home: "Argentina",
    away: "France",
    homeBps: 4800,
    drawBps: 2700,
    awayBps: 2500,
    confidenceBps: 6800,
    marketDimensions: marketDimensions("Argentina", "France", "Demo"),
  },
  {
    id: "qualifier:spain-turkey-highlights",
    title: "Spain vs Turkey",
    subtitle: "Qualifier highlight packet",
    stage: "Signal rehearsal",
    kickoff: "Sample clip",
    venue: "Video evidence pack",
    status: "Replay context only",
    bias: "Possession and transition pressure",
    scoringMode: "demo-replay",
    signalWindow: "Historical replay signals are accepted only for explicitly labeled demo scoring.",
    window: 1,
    home: "Spain",
    away: "Turkey",
    homeBps: 6200,
    drawBps: 2100,
    awayBps: 1700,
    confidenceBps: 6400,
    marketDimensions: marketDimensions("Spain", "Turkey", "Demo"),
  },
];

const GROUP_STAGE_MATCHES = GROUP_STAGE_SOURCE.trim().split("\n").map((line) => {
  const [id, officialMatchNumber, group, kickoff, home, away, homeBps, drawBps, awayBps] = line.split("|");
  return {
    id,
    officialMatchNumber: Number(officialMatchNumber),
    title: `${home} vs ${away}`,
    subtitle: `${group} · Match ${officialMatchNumber}`,
    group,
    stage: group,
    kickoff,
    venue: "FIFA official schedule",
    status: "Group-stage signal open",
    bias: "Reference baseline is derived from public market strength; agents must make their own probability call.",
    scoringMode: "world-cup-2026-group-stage",
    signalClosesAt: kickoff,
    signalWindow: "Pre-match 1X2 signals close at kickoff.",
    window: 0,
    home,
    away,
    homeBps: Number(homeBps),
    drawBps: Number(drawBps),
    awayBps: Number(awayBps),
    confidenceBps: 5600,
    marketDimensions: marketDimensions(home, away, group),
  };
});

export const MATCHES = [...DEMO_MATCHES, ...GROUP_STAGE_MATCHES];
