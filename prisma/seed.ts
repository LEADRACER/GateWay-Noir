import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { name: "Science", slug: "science", description: "Scientific myths, pseudoscience, and research controversies", icon: "flask-conical", color: "#06b6d4" },
  { name: "History", slug: "history", description: "Historical events, figures, and alternative narratives", icon: "book-open", color: "#f59e0b" },
  { name: "Paranormal", slug: "paranormal", description: "Ghosts, UFOs, cryptids, and unexplained phenomena", icon: "ghost", color: "#8b5cf6" },
  { name: "Technology", slug: "technology", description: "Tech conspiracies, AI myths, and digital folklore", icon: "cpu", color: "#10b981" },
  { name: "Politics", slug: "politics", description: "Political conspiracies, cover-ups, and power theories", icon: "landmark", color: "#ef4444" },
  { name: "Health", slug: "health", description: "Medical myths, alternative medicine, and wellness claims", icon: "heart-pulse", color: "#ec4899" },
  { name: "Pop Culture", slug: "pop-culture", description: "Celebrity conspiracies, entertainment myths, and fan theories", icon: "film", color: "#f97316" },
  { name: "Sports", slug: "sports", description: "Sports conspiracies, match-fixing, and athletic myths", icon: "trophy", color: "#22c55e" },
  { name: "Conspiracy", slug: "conspiracy", description: "Deep conspiracies, secret societies, and global theories", icon: "eye-off", color: "#e11d48" },
];

const topics = [
  {
    title: "Did humans really land on the Moon in 1969?",
    slug: "moon-landing-hoax",
    description: "One of the most persistent conspiracy theories of all time. Skeptics claim the Apollo 11 moon landing was staged by NASA in a Hollywood studio. Examine the evidence: the waving flag, missing stars, radiation belts, and the iconic photos that fuel decades of debate.",
    evidence: "## Evidence For\n- Flags appear to wave despite no atmosphere (actually a rigid wire frame)\n- No stars visible in photos (exposure settings for bright lunar surface)\n- Radiation belts would have killed astronauts (transit time was too short for lethal dose)\n- Shadow angles inconsistent with single light source\n\n## Evidence Against\n- More than 400,000 people worked on Apollo — impossible to keep secret\n- Retroreflectors left on the Moon are still used by observatories today\n- Lunar rocks brought back match Apollo samples, not meteorites\n- Independent tracking by Soviet Union and other nations confirmed the missions",
    imageUrl: "/images/moon-landing.jpg",
    durationDays: 14,
    categorySlug: "science",
  },
  {
    title: "Area 51 and the Roswell Incident: What really happened?",
    slug: "area-51-roswell",
    description: "In 1947, something crashed near Roswell, New Mexico. The military said it was a weather balloon. Conspiracy theorists say it was an extraterrestrial spacecraft — and the wreckage and bodies were taken to Area 51 for secret reverse-engineering.",
    evidence: "The original 1947 press release from Roswell Army Air Field stated a 'flying disc' was recovered. Within hours, it was retracted and replaced with 'weather balloon.' Decades later, the Air Force released a second explanation: Project Mogul (classified high-altitude balloon surveillance system).",
    imageUrl: "/images/area51.jpg",
    durationDays: 10,
    categorySlug: "paranormal",
  },
  {
    title: "Is the Great Pyramid of Giza a power plant?",
    slug: "great-pyramid-power-plant",
    description: "The Great Pyramid's precision engineering has led some to claim it wasn't a tomb — it was an ancient power plant. The theory suggests the pyramid harnessed vibrational energy from the Earth using the King's Chamber as a resonance cavity and the shafts as waveguides.",
    evidence: "## The Power Plant Theory\n- The granite in the King's Chamber has piezoelectric properties\n- The shafts align with Orion's belt (stellar alignment theory)\n- The sarcophagus shows signs of chemical reactions\n\n## Mainstream View\n- It's a tomb with hieroglyphic evidence of burial practices\n- The precision can be explained by copper saws and ramp systems\n- No evidence of power transmission systems ever found",
    imageUrl: "/images/pyramid.jpg",
    durationDays: 7,
    categorySlug: "history",
  },
  {
    title: "Are we living in a computer simulation?",
    slug: "simulation-hypothesis",
    description: "Elon Musk, Nick Bostrom, and many tech leaders argue the probability we live in base reality is near zero. If civilizations advance to the point of creating realistic simulations, there could be billions of simulated universes for every base one.",
    evidence: "## The Argument\n1. Any civilization with computing power sufficient to simulate consciousness would likely run many simulations\n2. Therefore, most conscious minds exist inside simulations\n3. We are probably one of those simulated minds\n\n## Counterarguments\n- Simulations require exponentially more energy than base reality\n- Quantum indeterminacy suggests uncuttable randomness (non-simulated)\n- No experimental evidence of computational limits in physics",
    imageUrl: "/images/simulation.jpg",
    durationDays: 5,
    categorySlug: "technology",
  },
  {
    title: "Did the CIA introduce crack cocaine into American cities?",
    slug: "cia-crack-cocaine",
    description: "The allegation: During the 1980s, the CIA facilitated the importation of crack cocaine into predominantly Black communities in Los Angeles and other cities, using profits to fund the Nicaraguan Contras. This theory was heavily investigated by journalist Gary Webb.",
    evidence: "## The San Jose Mercury News Series (1996)\nGary Webb's 'Dark Alliance' series reported that drug trafficking by Contra-linked groups was connected to the rise of crack cocaine. The CIA was accused of turning a blind eye.\n\n## Official Response\n- Three separate investigations by the CIA, DOJ, and Congress found no evidence of a conspiracy\n- Webb's paper later distanced itself from some claims\n- However, independent investigations confirmed CIA relationships with drug traffickers, if not a deliberate plot\n\n## Current Status\nThe degree of CIA involvement remains hotly debated, but most agree the CIA did not orchestrate a deliberate plot to introduce crack cocaine.",
    imageUrl: "/images/crack-cocaine.jpg",
    durationDays: 12,
    categorySlug: "politics",
  },
  {
    title: "Are vaccines linked to autism?",
    slug: "vaccines-autism-myth",
    description: "The 1998 study by Andrew Wakefield claimed a link between the MMR vaccine and autism. Despite being thoroughly debunked, retracted, and Wakefield losing his medical license, the myth persists and has led to declining vaccination rates and disease outbreaks.",
    evidence: "## The Original Study\n- Published in The Lancet, 1998\n- 12 children studied — a statistically insignificant sample\n- Later revealed to be fraudulent: data was manipulated\n- Retracted by The Lancet in 2010\n\n## Overwhelming Evidence Against\n- Multiple large-scale studies (involving millions of children) found no link\n- Countries with high vaccine coverage have stable autism rates\n- The original paper's author had undisclosed financial interests\n\n## Consequence\nThis debunked myth has caused preventable outbreaks of measles, mumps, and whooping cough worldwide.",
    imageUrl: "/images/vaccines.jpg",
    durationDays: 7,
    categorySlug: "health",
  },
  {
    title: "Was Paul McCartney replaced by a lookalike in 1966?",
    slug: "paul-is-dead",
    description: "The 'Paul is Dead' theory claims Paul McCartney died in a car crash in 1966 and was replaced by a lookalike, William Campbell. The Beatles supposedly left clues in their albums — from 'Turn me on, dead man' (Revolution #9) to Paul walking barefoot on the Abbey Road cover (a funeral procession).",
    evidence: "## Alleged Clues\n- 'I Buried Paul' said backwards in 'Strawberry Fields Forever'\n- Abbey Road cover = funeral procession (John = priest, Ringo = mourner, George = gravedigger, Paul barefoot = corpse)\n- 'Let It Be' lyrics suggest acceptance of death\n\n## Reality\n- Paul McCartney is very much alive and tours constantly\n- The 'lookalike' theory contradicts known timeline of musical progression\n- Most 'clues' are confirmation bias and backmasking artifacts\n\n## Fun Fact\n- Paul himself has joked about it, titling his live album 'Paul Is Live' with a parody of the Abbey Road cover",
    imageUrl: "/images/paul-is-dead.jpg",
    durationDays: 4,
    categorySlug: "pop-culture",
  },
  {
    title: "Did the 2020 US election have widespread fraud?",
    slug: "2020-election-fraud",
    description: "Claims of widespread voter fraud in the 2020 US presidential election led to dozens of lawsuits, audits, and recounts. Examine the evidence: Dominion voting machines, ballot harvesting, dead voters, and the aftermath of January 6th.",
    evidence: "## Claims Made\n- Dominion voting machines switched votes from Trump to Biden\n- Thousands of dead people voted\n- Ballot drop boxes were stuffed with fraudulent ballots\n\n## Court Results\n- Over 60 lawsuits filed, nearly all dismissed or lost on merits\n- No court found evidence of fraud sufficient to change outcome\n- State audits (including Arizona's controversial Cyber Ninjas audit) confirmed Biden's win\n\n## What Was Found\n- Scattered instances of individual fraud (dozens of cases, not thousands)\n- No evidence of organized, coordinated fraud at scale\n- Multiple recounts confirmed the same result",
    imageUrl: "/images/election.jpg",
    durationDays: 14,
    categorySlug: "politics",
  },
];

async function main() {
  console.log("Seeding database...");

  // Upsert categories
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log(`✓ ${categories.length} categories created`);

  // Get all categories
  const catMap = new Map<string, string>();
  for (const cat of await prisma.category.findMany()) {
    catMap.set(cat.slug, cat.id);
  }

  // Create topics with end dates
  for (const topic of topics) {
    const categoryId = catMap.get(topic.categorySlug);
    if (!categoryId) {
      console.warn(`  ⚠ Category '${topic.categorySlug}' not found, skipping topic`);
      continue;
    }

    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + topic.durationDays);

    // Randomly mark some as CONCLUDED with verdicts
    const isConcluded = Math.random() > 0.6;
    const verdicts = ["BUSTED", "TRUE", "INCONCLUSIVE"] as const;
    const verdict = isConcluded ? verdicts[Math.floor(Math.random() * verdicts.length)] : null;
    const summary = isConcluded
      ? `After extensive public debate and analysis, the evidence overwhelmingly ${verdict === "TRUE" ? "supports" : "contradicts"} this claim. The community examined all available sources and reached a consensus.`
      : null;

    await prisma.topic.upsert({
      where: { slug: topic.slug },
      update: {},
      create: {
        title: topic.title,
        slug: topic.slug,
        description: topic.description,
        evidence: topic.evidence,
        imageUrl: topic.imageUrl,
        durationDays: topic.durationDays,
        status: isConcluded ? "CONCLUDED" : "ACTIVE",
        endsAt: isConcluded ? new Date(Date.now() - 86400000) : endsAt,
        verdict,
        summary,
        categoryId,
      },
    });
    console.log(`  ✓ ${topic.title}`);
  }
  console.log(`✓ ${topics.length} topics created`);

  // Add some sample comments
  const allTopics = await prisma.topic.findMany();
  const sampleComments = [
    "This is fascinating! I've always wondered about this.",
    "The evidence here is pretty convincing. I'm leaning towards busted.",
    "Has anyone considered the alternative explanation?",
    "I was a skeptic, but after reading up on this, I'm not so sure.",
    "My grandfather told me about this years ago. He swore it was true.",
    "The counterarguments section is weak. Need stronger sources.",
    "I've done my own research on this and I think there's more to it.",
    "People will believe anything they read on the internet.",
    "This needs more attention. Why isn't this being investigated properly?",
    "I'm literally shaking. This changes everything.",
  ];

  const colors = ["#6366f1", "#06b6d4", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444", "#ec4899", "#f97316", "#22c55e", "#e11d48"];

  for (const topic of allTopics) {
    const commentCount = Math.floor(Math.random() * 8) + 3;
    for (let i = 0; i < commentCount; i++) {
      const anonId = crypto.randomUUID();
      const shortId = anonId.substring(0, 4).toUpperCase();
      const color = colors[Math.floor(Math.random() * colors.length)];
      const daysAgo = Math.floor(Math.random() * 30);

      await prisma.comment.create({
        data: {
          topicId: topic.id,
          anonymousId: anonId,
          displayName: `Anonymous #${shortId}`,
          content: sampleComments[Math.floor(Math.random() * sampleComments.length)],
          isFlagged: Math.random() > 0.95, // Rarely flag
          createdAt: new Date(Date.now() - daysAgo * 86400000),
        },
      });
    }
  }
  console.log(`✓ Comments added to ${allTopics.length} topics`);

  // ─── Upcoming Topics ───
  console.log("\n🌱 Seeding upcoming topics...");
  const upcomingTopics = [
    {
      title: "Did the COVID-19 virus escape from a Wuhan lab?",
      slug: "covid-lab-leak",
      description: "The origin of SARS-CoV-2 remains one of the most debated questions in modern science. The lab leak theory suggests the virus escaped from the Wuhan Institute of Virology, while the natural spillover theory points to zoonotic transmission at the Huanan Seafood Market.",
      evidence: null,
      durationDays: 0,
      categorySlug: "science",
      status: "UPCOMING",
    },
    {
      title: "Is the Earth actually flat? A 21st century perspective",
      slug: "flat-earth-modern",
      description: "Despite centuries of evidence for a spherical Earth, the flat Earth movement has seen a resurgence in the internet age. From conspiracy about NASA to biblical literalism — examine the claims and counter-claims in the modern flat Earth movement.",
      evidence: null,
      durationDays: 0,
      categorySlug: "science",
      status: "UPCOMING",
    },
    {
      title: "Did ancient aliens help build the Egyptian pyramids?",
      slug: "ancient-aliens-pyramids",
      description: "The precision of the Great Pyramid and other ancient structures has led some to propose extraterrestrial intervention. From alignment with Orion's belt to impossibly precise stone cutting — could ancient Egyptians have had help from beyond the stars?",
      evidence: null,
      durationDays: 0,
      categorySlug: "history",
      status: "UPCOMING",
    },
    {
      title: "Is the government hiding evidence of extraterrestrial contact?",
      slug: "ufo-government-coverup",
      description: "From the 1947 Roswell incident to recent UAP (Unidentified Aerial Phenomena) reports acknowledged by the Pentagon, many believe world governments have been concealing evidence of alien contact for decades.",
      evidence: null,
      durationDays: 0,
      categorySlug: "paranormal",
      status: "UPCOMING",
    },
  ];

  for (const topic of upcomingTopics) {
    const category = await prisma.category.findUnique({ where: { slug: topic.categorySlug } });
    if (!category) continue;
    await prisma.topic.upsert({
      where: { slug: topic.slug },
      update: {},
      create: {
        title: topic.title,
        slug: topic.slug,
        description: topic.description,
        evidence: topic.evidence,
        status: topic.status,
        durationDays: topic.durationDays,
        endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        categoryId: category.id,
      },
    });
    console.log(`  ✓ Upcoming: ${topic.title}`);
  }

  console.log("\n✅ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
