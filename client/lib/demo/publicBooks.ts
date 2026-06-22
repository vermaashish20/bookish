import type { ChapterItem } from '@/lib/types';

export interface PublicBookCard {
  id: string;
  title: string;
  genre: string;
  author: string;
  chapterCount: number;
  coverTone: string;
  isDemo?: boolean;
}

export interface DemoPublicBook extends PublicBookCard {
  isDemo: true;
  subtitle?: string;
  chapters: ChapterItem[];
}

function makeDemoBook(
  slug: string,
  title: string,
  genre: string,
  author: string,
  chapterCount: number,
  coverTone: string,
  opening: string,
  chapterTitle = 'Opening',
): DemoPublicBook {
  return {
    id: `demo-${slug}`,
    title,
    genre,
    author,
    chapterCount,
    coverTone,
    isDemo: true,
    chapters: [
      {
        id: 'ch-1',
        number: 1,
        title: chapterTitle,
        wordCount: opening.split(/\s+/).length,
        status: 'published',
        content: opening,
      },
    ],
  };
}

export const DEMO_PUBLIC_BOOKS: DemoPublicBook[] = [
  {
    id: 'demo-clockwork-orchard',
    title: 'The Clockwork Orchard',
    genre: 'Fantasy',
    author: 'Mara Venn',
    chapterCount: 3,
    coverTone: '#d9e3d1',
    isDemo: true,
    subtitle: 'A tale of gears, roots, and borrowed time',
    chapters: [
      {
        id: 'ch-1',
        number: 1,
        title: 'The Orchard That Never Slept',
        wordCount: 420,
        status: 'published',
        content: `The orchard breathed in copper and rain.

Every branch wore a thin bracelet of brass, and when the wind crossed the valley the whole grove chimed like a choir tuning before a hymn. Mara had grown up believing the sound meant safety. Tonight it sounded like a warning.

She stepped between the rows with her lantern low. The apples here were not fruit so much as memory—each one stored a moment someone in the city had traded away. A first kiss. A mother's lullaby. The exact shade of blue above a childhood window.

"You're late," said the Forester without turning. He sat on a stool beneath the oldest tree, polishing a key that had no teeth.

"I came as soon as the gate opened."

"The gate opens when it wants to." He finally looked at her. His eyes were the color of old pennies. "You still want the apprenticeship?"

Mara nodded. She had spent three years petitioning the Ministry of Unsent Letters for a permit just to stand in this orchard legally. "I want to learn how the trees remember."

The Forester tossed her the key. It was warm, and it hummed against her palm.

"Then start by listening," he said. "The orchard is awake tonight. Something is being planted that doesn't belong."`,
      },
      {
        id: 'ch-2',
        number: 2,
        title: 'Letters in the Root Cellar',
        wordCount: 380,
        status: 'published',
        content: `Beneath the orchard, the root cellar held more than soil.

Mara descended the spiral stairs with the humming key in her pocket. Each step was carved with a name she did not recognize—writers, cartographers, a woman who had mapped the missing. The air grew cooler and sweeter, like crushed apples and ink.

At the bottom, rows of glass jars lined the walls. Inside each jar, a folded letter floated as if suspended in water that wasn't there. Some were addressed. Some were blank. All of them pulsed faintly, in rhythm with the trees above.

"Don't touch the sealed ones," the Forester called from the stairwell. "They belong to people who haven't decided yet."

Mara stopped before a jar with her own surname etched into the glass. Her breath fogged the surface. The letter inside was empty.

"That's not possible," she whispered.

"It is if you haven't written it yet," the Forester said. "Or if someone else wrote it for you."

He handed her a pen made from a twig and a gear. "Every apprentice plants one letter before dawn. Choose carefully. The orchard keeps what you give it."`,
      },
      {
        id: 'ch-3',
        number: 3,
        title: 'The First Harvest',
        wordCount: 410,
        status: 'published',
        content: `Dawn came without color.

Mara sat at the base of the oldest tree with the twig-gear pen in her hand and the empty jar before her. She had written three drafts and burned two. The third she folded until it was small enough to fit through the jar's mouth.

The letter was not a confession. It was a question: *What did the city lose when it learned to trade memories for convenience?*

She placed it inside. The jar sealed itself with a sound like a book closing.

Aboveground, the orchard shuddered. Brass leaves rattled. One branch lowered toward her, offering an apple the size of her fist. Its skin was polished metal, warm as a heartbeat.

"The first harvest is always yours," the Forester said. "Eat it and you'll remember something the city forgot. Refuse it and the orchard will choose for you."

Mara took the apple. She bit.

For a moment she was somewhere else—a rooftop at the edge of tomorrow, tea steaming, two impossible hearts speaking in winter light. Then she was back among the trees, tasting rain and copper, knowing exactly which memory she had just returned to the world.`,
      },
    ],
  },
  {
    id: 'demo-low-orbit',
    title: 'Letters from Low Orbit',
    genre: 'Sci-fi',
    author: 'Bookish',
    chapterCount: 2,
    coverTone: '#d8dde8',
    isDemo: true,
    chapters: [
      {
        id: 'ch-1',
        number: 1,
        title: 'Departure Window',
        wordCount: 350,
        status: 'published',
        content: `The shuttle left at 0600 station time, which meant nothing to the people still on Earth and everything to the people who had already learned to sleep in sixteen-minute cycles.

I wrote my first letter from low orbit because the view made honesty feel mandatory. Below us, continents were soft suggestions. Above us, nothing.

Dear M—
If you're reading this, the relay worked. I'm not sure what I am allowed to say about the cargo, so I'll say this instead: I miss the sound of your keys at night. Up here, typing is silent.`,
      },
      {
        id: 'ch-2',
        number: 2,
        title: 'Signal Delay',
        wordCount: 320,
        status: 'published',
        content: `Replies arrive late. Grief arrives on schedule.

The delay is eleven minutes on a good day. I send a question and make coffee. By the time the answer returns, I've already answered it myself three different ways.

Today the station lost a crate of seeds. Not a metaphor—actual seeds, labeled in a language no one on shift recognizes. I held one in my palm and thought of orchards that breathe in copper.

Maybe that's what we're carrying. Not supplies. Possibilities.`,
      },
    ],
  },
  {
    id: 'demo-paper-kingdom',
    title: 'The Paper Kingdom Beneath the Stairs',
    genre: 'Adventure',
    author: 'Ilya Rowan',
    chapterCount: 2,
    coverTone: '#e7dfcf',
    isDemo: true,
    chapters: [
      {
        id: 'ch-1',
        number: 1,
        title: 'The Seventh Step',
        wordCount: 340,
        status: 'published',
        content: `Every house has a place where the rules soften. In ours, it was the seventh step.

If you sat there long enough with a flashlight and a library book, the stairwell stopped being wood and became a border. On the other side: a kingdom drawn in pencil, complete with rivers that smudged when you breathed too hard.

I was eleven the first time I saw the courier—a fox made of folded maps, waiting with a parcel addressed to me in my own handwriting.`,
      },
      {
        id: 'ch-2',
        number: 2,
        title: "Cartographer's Fee",
        wordCount: 360,
        status: 'published',
        content: `The Paper Kingdom taxes its visitors in stories.

To cross the bridge of receipts, I paid with the tale of how I lost my first tooth. To enter the capital, I owed a secret. The cartographer who mapped the missing met me at the gate and asked for something harder.

"Give me a memory you haven't used yet," she said.

I thought of the orchard. Of apples that remembered. Of letters that floated in jars.

"I'll pay on credit," I said.

She laughed, and the laugh became a road on her map.`,
      },
    ],
  },
  {
    id: 'demo-tea-house',
    title: 'The Last Tea House at the Edge of Tomorrow',
    genre: 'Literary',
    author: 'Bookish',
    chapterCount: 1,
    coverTone: '#d7e4df',
    isDemo: true,
    chapters: [
      {
        id: 'ch-1',
        number: 1,
        title: 'Closing Hour',
        wordCount: 390,
        status: 'published',
        content: `The tea house existed one hour ahead of everyone else.

You felt it when you crossed the threshold—the slight lift in your chest, as if you'd remembered a appointment you hadn't written down. The proprietor poured without asking. The steam spelled names you hadn't spoken aloud in years.

Tonight there were two cups set out and only one of me.

"You've been expecting someone," I said.

"I've been expecting the version of you that arrives on time," she replied. "Sit. Tomorrow is almost here, and it prefers its guests seated."`,
      },
    ],
  },
  {
    id: 'demo-cartographer',
    title: 'The Cartographer Who Mapped the Missing',
    genre: 'Mystery',
    author: 'Elian Frost',
    chapterCount: 1,
    coverTone: '#e2d8d1',
    isDemo: true,
    chapters: [
      {
        id: 'ch-1',
        number: 1,
        title: 'Blank Squares',
        wordCount: 300,
        status: 'published',
        content: `The map arrived without an return address, which was appropriate for a document obsessed with absences.

Elian spread it across the kitchen table and weighted the corners with coffee mugs. Every street he knew was drawn in confident ink. Every street the city had lost was left blank—a hole in the paper shaped exactly like a memory you can almost recall.

In the margin, in handwriting he recognized as his own, someone had written: *Start with the alley that isn't there anymore.*`,
      },
    ],
  },
  {
    id: 'demo-winter-garden',
    title: 'A Winter Garden for Two Impossible Hearts',
    genre: 'Romance',
    author: 'Nisha Vale',
    chapterCount: 1,
    coverTone: '#dce5e2',
    isDemo: true,
    chapters: [
      {
        id: 'ch-1',
        number: 1,
        title: 'Glass Under Frost',
        wordCount: 280,
        status: 'published',
        content: `The greenhouse should not have been warm.

Outside, the city wore January like a verdict. Inside, Nisha's breath did not fog the glass. She found him already among the dormant roses, reading aloud to plants that listened better than people.

"You came," he said.

"I always come when you leave the door unlatched," she replied. "Even when the door is a metaphor."

He smiled. "Especially then."`,
      },
    ],
  },
  {
    id: 'demo-moon-names',
    title: 'When the Moon Learned Our Names',
    genre: 'Speculative',
    author: 'Bookish',
    chapterCount: 1,
    coverTone: '#ddd8e8',
    isDemo: true,
    chapters: [
      {
        id: 'ch-1',
        number: 1,
        title: 'Tidal Alphabet',
        wordCount: 290,
        status: 'published',
        content: `On the night the moon learned our names, the tides spelled them in reverse.

Children stayed up past curfew to listen. Old poets claimed they'd been waiting for this since the first cave painting of a crescent. The government issued a statement advising calm.

I walked to the shore and shouted my name at the water. The wave that answered was not my name exactly, but the version of it I would have chosen if I'd been born with better verbs.`,
      },
    ],
  },
  {
    id: 'demo-unsent-letters',
    title: 'The Ministry of Unsent Letters and Small Revolutions',
    genre: 'Historical',
    author: 'Rosa Calder',
    chapterCount: 1,
    coverTone: '#e4e0d1',
    isDemo: true,
    chapters: [
      {
        id: 'ch-1',
        number: 1,
        title: 'Archive Hour',
        wordCount: 310,
        status: 'published',
        content: `The Ministry did not deliver mail. It catalogued courage that never left the drawer.

Rosa's first assignment was the third floor: letters addressed to kings, lovers, and future selves, none of which had ever seen a stamp. She wore white gloves and a expression she'd practiced in mirrors.

"Don't read for plot," her supervisor said. "Read for what the city was afraid to send."

By noon she'd found three revolutions smaller than sentences and one apology that could have prevented a war.`,
      },
    ],
  },
  makeDemoBook(
    'glass-river',
    'Glass River Saints',
    'Fantasy',
    'Mara Venn',
    14,
    '#cfd9c8',
    `The river ran clear enough to read yesterday in. Pilgrims lined the banks with notebooks, copying reflections they hoped would still be true by morning.`,
    'River Glass',
  ),
  makeDemoBook(
    'small-moon',
    'Manual for a Small Moon',
    'Sci-fi',
    'Bookish',
    9,
    '#d0d5e4',
    `Section 1: Your moon will arrive smaller than advertised. Do not return it. Orbit begins the moment you stop checking the tracking number.`,
    'Section 1',
  ),
  makeDemoBook(
    'forgotten-storms',
    'The Archivist of Forgotten Storms',
    'Literary',
    'Elian Frost',
    11,
    '#e0d6cc',
    `Storms leave paperwork. Wind speed, barometric guilt, names of birds that refused to fly. Someone has to file what the sky wanted and never received.`,
    'Weather Ledger',
  ),
  makeDemoBook(
    'salt-lines',
    'Salt Lines and Silver Cities',
    'Adventure',
    'Ilya Rowan',
    16,
    '#d5e0d8',
    `The caravan followed lines of salt through desert that remembered oceans. At night the silver cities appeared on the horizon, always one day ahead.`,
    'First Salt',
  ),
  makeDemoBook(
    'committee-dreams',
    'Beneath the Committee of Dreams',
    'Speculative',
    'Nisha Vale',
    10,
    '#dcd4e8',
    `Every citizen submitted dreams for review. Most were approved with minor edits. Mine came back stamped: *See appendix: forbidden metaphors.*`,
    'Form 12-D',
  ),
  makeDemoBook(
    'gentle-apocalypses',
    'A Field Guide to Gentle Apocalypses',
    'Non-fiction',
    'Rosa Calder',
    8,
    '#e8e2d4',
    `Not all endings arrive with sirens. Some tiptoe in as a change of season, a new species of silence, a library that stops lending books about tomorrow.`,
    'Preface',
  ),
  makeDemoBook(
    'locksmith-yesterday',
    'The Locksmith Who Opened Yesterday',
    'Mystery',
    'Elian Frost',
    13,
    '#d8ddd1',
    `The key he cut did not fit any door in the building. It fit a Tuesday three weeks ago, where a conversation I'd regretted was still waiting to be finished.`,
    'Wrong Tuesday',
  ),
  makeDemoBook(
    'broken-satellites',
    'Choir of Broken Satellites',
    'Sci-fi',
    'Bookish',
    12,
    '#c9d3e6',
    `They drift in formation, singing fragments of old broadcasts. Tuning into the choir is illegal. Listening anyway is how I learned my mother's voice again.`,
    'Signal One',
  ),
  makeDemoBook(
    'negotiating-ghosts',
    'Recipes for Negotiating with Ghosts',
    'Fantasy',
    'Mara Venn',
    15,
    '#dfe8d6',
    `Start with a name spoken softly. Add one true apology, unsweetened. Never offer them your future tense—they find it bitter.`,
    'Recipe I',
  ),
  makeDemoBook(
    'helena-crow',
    'The Second Life of Helena Crow',
    'Romance',
    'Nisha Vale',
    17,
    '#e5dde3',
    `Helena died on page ninety. She reappeared in the margins of my draft with corrections and a request: *Give me a better exit or a better return.*`,
    'Margin Notes',
  ),
  makeDemoBook(
    'ironwood-almanac',
    'Ironwood Almanac',
    'Historical',
    'Rosa Calder',
    22,
    '#d9d2c6',
    `Year of the Bent Nail: frost came early, marriages came late, and the ironwood trees produced seeds that chimed when shaken in a coat pocket.`,
    'Year of the Bent Nail',
  ),
  makeDemoBook(
    'cities-forgotten',
    'Cities That Forgot Their Names',
    'Urban',
    'Bookish',
    10,
    '#d4dfe8',
    `The metro maps updated themselves overnight. Stations labeled *Formerly* appeared between stops no one remembered building.`,
    'Unnamed Stop',
  ),
  makeDemoBook(
    'borrowed-calendar',
    'The Borrowed Calendar',
    'Literary',
    'Ilya Rowan',
    7,
    '#e2e6d1',
    `I rented three extra days from a shop that sold time in envelopes. The interest was steep: one memory per hour overdue.`,
    'Day 31',
  ),
  makeDemoBook(
    'quiet-war',
    'Notes from the Quiet War',
    'Thriller',
    'Elian Frost',
    19,
    '#d6d8dc',
    `No uniforms. No declarations. Only missing pages in public records and librarians who suddenly learned to lie with perfect courtesy.`,
    'White Archive',
  ),
  makeDemoBook(
    'starlight-margin',
    'Starlight Margin',
    'Sci-fi',
    'Bookish',
    11,
    '#cbd8e4',
    `The colony kept its books on the edge of the hab dome where starlight could reach the spines. We read by leakage from the universe.`,
    'Dome Edge',
  ),
  makeDemoBook(
    'harbor-unfinished',
    'Harbor of Unfinished Songs',
    'Fantasy',
    'Mara Venn',
    14,
    '#dce5df',
    `Sailors arrive humming melodies they cannot complete. The harbor collects endings the way other ports collect tariffs.`,
    'Incomplete Tune',
  ),
  makeDemoBook(
    'violet-compass',
    'The Violet Compass',
    'Adventure',
    'Ilya Rowan',
    18,
    '#ddd0e0',
    `It did not point north. It pointed toward whatever you were pretending not to want. I pretended very hard. The needle laughed.`,
    'First Needle',
  ),
];

export function getDemoBook(id: string): DemoPublicBook | undefined {
  return DEMO_PUBLIC_BOOKS.find((book) => book.id === id);
}

export function isDemoBookId(id: string): boolean {
  return id.startsWith('demo-');
}

/** Showcase cards for the home grid (includes all demo books). */
export const SHOWCASE_BOOKS: PublicBookCard[] = DEMO_PUBLIC_BOOKS.map(
  ({ id, title, genre, author, chapterCount, coverTone, isDemo }) => ({
    id,
    title,
    genre,
    author,
    chapterCount,
    coverTone,
    isDemo,
  }),
);

export const COVER_TONES = [
  '#d9e3d1',
  '#d8dde8',
  '#e7dfcf',
  '#d7e4df',
  '#e2d8d1',
  '#dce5e2',
  '#ddd8e8',
  '#e4e0d1',
  '#cfd9c8',
  '#d0d5e4',
  '#e0d6cc',
  '#d5e0d8',
  '#dcd4e8',
  '#e8e2d4',
  '#d8ddd1',
  '#c9d3e6',
  '#dfe8d6',
  '#e5dde3',
  '#d9d2c6',
  '#d4dfe8',
  '#e2e6d1',
  '#d6d8dc',
  '#cbd8e4',
  '#dce5df',
  '#ddd0e0',
];

export function pickCoverTone(index: number): string {
  return COVER_TONES[index % COVER_TONES.length]!;
}
