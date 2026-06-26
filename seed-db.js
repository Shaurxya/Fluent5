const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^#][^=]*)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function seed() {
  console.log('🌱 Seeding database...\n');

  // 1. Activities
  const { error: e1 } = await supabase.from('activities').upsert([
    { key: 'shadow', title: 'Shadowing', description: 'Listen to a model sentence, record yourself, and compare your pronunciation.', position: 1 },
    { key: 'speak', title: 'Speak & Think Out Loud', description: 'Respond to a prompt for 2 minutes while your speech is transcribed live.', position: 2 },
    { key: 'read', title: 'Active Reading + Chunks', description: 'Read a passage, save useful phrases, and explore definitions.', position: 3 },
    { key: 'write', title: 'Write & Rewrite', description: 'Write a draft, check grammar & style, then polish your rewrite.', position: 4 },
    { key: 'review', title: 'Spaced Repetition Review', description: 'Review your saved chunks with flashcards using spaced repetition.', position: 5 },
  ], { onConflict: 'key' });
  console.log(e1 ? `❌ Activities: ${e1.message}` : '✅ Activities seeded');

  // 2. Sentences
  const sentences = [
    { level: 'easy', text: 'The weather is beautiful today.' },
    { level: 'easy', text: 'I would like a cup of coffee, please.' },
    { level: 'easy', text: 'She goes to the park every morning.' },
    { level: 'easy', text: 'Can you help me find the library?' },
    { level: 'easy', text: 'We had a wonderful time at the beach.' },
    { level: 'easy', text: 'He reads a book before going to sleep.' },
    { level: 'easy', text: 'The children are playing in the garden.' },
    { level: 'easy', text: 'I need to buy some groceries after work.' },
    { level: 'easy', text: 'Thank you for your help with this project.' },
    { level: 'easy', text: 'The train arrives at the station at nine o\'clock.' },
    { level: 'med', text: 'Despite the heavy rain, they decided to continue their hike through the forest.' },
    { level: 'med', text: 'The conference was attended by experts from more than twenty different countries.' },
    { level: 'med', text: 'She has been working on this research project for almost three years now.' },
    { level: 'med', text: 'If I had known about the traffic, I would have left the house much earlier.' },
    { level: 'med', text: 'The documentary explores how technology has transformed the way we communicate.' },
    { level: 'med', text: 'He apologized for the misunderstanding and offered to make it right.' },
    { level: 'med', text: 'The restaurant on the corner serves the best Italian food in the neighborhood.' },
    { level: 'med', text: 'Learning a new language requires consistent practice and a lot of patience.' },
    { level: 'med', text: 'The company announced plans to expand its operations into three new markets.' },
    { level: 'med', text: 'She was surprised to discover that the museum was offering free admission all week.' },
    { level: 'hard', text: 'The unprecedented economic downturn has prompted governments worldwide to implement extraordinary fiscal measures to stabilize their financial systems.' },
    { level: 'hard', text: 'Notwithstanding the substantial challenges posed by climate change, renewable energy technologies have demonstrated remarkable progress in efficiency and affordability.' },
    { level: 'hard', text: 'The philosophical implications of artificial intelligence raise fundamental questions about consciousness, autonomy, and what it truly means to be human.' },
    { level: 'hard', text: 'Having meticulously analyzed the experimental data, the researchers concluded that the correlation between the two variables was statistically insignificant.' },
    { level: 'hard', text: 'The architectural masterpiece, which took over a decade to complete, seamlessly integrates sustainable design principles with breathtaking aesthetic innovation.' },
    { level: 'hard', text: 'Contemporary neuroscience suggests that the brain\'s neuroplasticity allows for continuous adaptation and learning throughout the entire span of human life.' },
    { level: 'hard', text: 'The geopolitical ramifications of the trade agreement extend far beyond economics, fundamentally reshaping diplomatic relationships across the entire region.' },
    { level: 'hard', text: 'While the theoretical framework provides a comprehensive foundation, its practical application requires nuanced understanding of contextual variables and stakeholder dynamics.' },
    { level: 'hard', text: 'The interdisciplinary approach to urban planning incorporates insights from sociology, environmental science, and behavioral economics to create more livable cities.' },
    { level: 'hard', text: 'Critically examining the historical narrative reveals a more complex and multifaceted reality than what is conventionally portrayed in mainstream textbooks.' },
  ];
  const { error: e2 } = await supabase.from('sentences').insert(sentences);
  console.log(e2 ? `❌ Sentences: ${e2.message}` : `✅ ${sentences.length} sentences seeded`);

  // 3. Passages
  const passages = [
    { title: 'The Power of Habits', level: 'easy', body: `Habits shape our daily lives more than we realize. Research shows that nearly 40% of our everyday actions are driven by habits rather than conscious decisions. A habit loop consists of three components: a cue, a routine, and a reward. The cue triggers the behavior, the routine is the action itself, and the reward is what reinforces the loop.\n\nUnderstanding this loop is the key to changing unwanted habits and building new ones. To create a new habit, start by identifying a clear cue — perhaps a specific time of day or an existing routine. Then, define the new behavior you want to adopt and attach a meaningful reward to it.\n\nConsistency is crucial in the early stages. Research suggests it takes an average of 66 days for a new behavior to become automatic. During this period, tracking your progress and celebrating small wins can significantly increase your chances of success. Remember, the goal is not perfection but persistence.` },
    { title: 'The Science of Sleep', level: 'med', body: `Sleep is one of the most important yet often overlooked aspects of health. During sleep, the brain consolidates memories, repairs cells, and clears toxic waste products that accumulate during waking hours. Adults typically need between seven and nine hours of sleep per night for optimal functioning.\n\nThe sleep cycle consists of several stages, including light sleep, deep sleep, and REM (rapid eye movement) sleep. Each stage serves a distinct purpose. Deep sleep is essential for physical recovery and immune function, while REM sleep plays a crucial role in emotional regulation and creative problem-solving.\n\nModern society poses numerous threats to healthy sleep patterns. Blue light from screens suppresses melatonin production, caffeine consumed too late in the day can delay sleep onset, and irregular schedules disrupt the body's circadian rhythm. Establishing a consistent bedtime routine, limiting screen exposure before bed, and creating a cool, dark sleeping environment are evidence-based strategies for improving sleep quality.` },
    { title: 'Digital Minimalism', level: 'med', body: `In an era of constant connectivity, digital minimalism offers a philosophy of technology use that prioritizes intentionality over convenience. Coined by computer scientist Cal Newport, the term describes a deliberate approach to choosing which digital tools and platforms deserve your time and attention.\n\nThe core principle is simple: technology should serve your values, not the other way around. This means critically evaluating each app, platform, and digital habit to determine whether it genuinely adds value to your life. If it doesn't, it should be eliminated or significantly reduced.\n\nPractitioners of digital minimalism often report unexpected benefits. They describe deeper conversations, increased creativity, reduced anxiety, and a stronger sense of presence in their daily lives. The practice doesn't require abandoning technology entirely but rather cultivating a more thoughtful and selective relationship with the digital world.\n\nStarting your own digital minimalism practice can begin with a simple 30-day experiment: remove all optional technology from your life, then gradually reintroduce only the tools that pass a strict value test.` },
    { title: 'The Art of Deep Work', level: 'hard', body: `Deep work, a concept popularized by productivity expert Cal Newport, refers to the ability to focus without distraction on a cognitively demanding task. In our increasingly connected world, this skill is becoming both rarer and more valuable simultaneously.\n\nThe modern knowledge economy rewards those who can produce at an elite level, and elite production requires deep, sustained concentration. Yet most professionals spend their days in a state of shallow work — answering emails, attending meetings, and responding to instant messages — activities that feel productive but rarely move the needle on important projects.\n\nTraining your capacity for deep work requires treating it like a muscle. Start with short focused sessions of 30 to 60 minutes and gradually extend them. Create rituals around your deep work: a specific location, a particular beverage, a consistent time of day. These environmental cues help your brain transition into a focused state more quickly.\n\nEqually important is learning to embrace boredom. If you reach for your phone every time you have a moment of downtime, you're training your brain to expect constant stimulation, making sustained concentration increasingly difficult.` },
    { title: 'The Future of Language Learning', level: 'hard', body: `Language learning has undergone a remarkable transformation in the digital age. Traditional methods that relied heavily on grammar drills and vocabulary memorization are being supplemented — and in some cases replaced — by approaches that prioritize authentic communication and immersive experiences.\n\nResearch in second language acquisition consistently shows that comprehensible input is the single most important factor in language learning. This means exposure to language that is slightly above the learner's current level, delivered in a meaningful context. Podcasts, videos, and conversation with native speakers all provide rich sources of comprehensible input.\n\nSpaced repetition systems have emerged as one of the most effective tools for vocabulary acquisition. By presenting words and phrases at increasing intervals just before they would be forgotten, these systems exploit the spacing effect — a well-documented phenomenon in cognitive psychology that demonstrates how distributed practice leads to more durable memories than massed practice.\n\nHowever, technology alone cannot replace the human elements of language learning. The emotional connection formed through real conversations, the cultural insights gained through authentic interaction, and the motivation derived from genuine communication remain irreplaceable components of the language acquisition process.` },
  ];
  const { error: e3 } = await supabase.from('passages').insert(passages);
  console.log(e3 ? `❌ Passages: ${e3.message}` : `✅ ${passages.length} passages seeded`);

  // 4. Quiz Questions
  const quizzes = [
    { level: 'easy', prompt: 'Choose the correct form: "She ___ to the store every day."', options: ["go","goes","going","gone"], answer_index: 1 },
    { level: 'easy', prompt: 'Which sentence is correct?', options: ["He don't like coffee.","He doesn't likes coffee.","He doesn't like coffee.","He not like coffee."], answer_index: 2 },
    { level: 'easy', prompt: 'Fill in the blank: "I have been living here ___ five years."', options: ["since","for","from","during"], answer_index: 1 },
    { level: 'easy', prompt: 'Choose the correct word: "There are ___ apples on the table."', options: ["much","a","some","an"], answer_index: 2 },
    { level: 'easy', prompt: "Which is the past tense of 'begin'?", options: ["beginned","began","begun","beginned"], answer_index: 1 },
    { level: 'med', prompt: 'Choose the correct option: "If I ___ rich, I would travel the world."', options: ["am","was","were","be"], answer_index: 2 },
    { level: 'med', prompt: 'Which sentence uses the correct preposition?', options: ["She arrived to the airport.","She arrived at the airport.","She arrived in the airport.","She arrived on the airport."], answer_index: 1 },
    { level: 'med', prompt: 'Fill in the blank: "Not only ___ intelligent, but she is also hardworking."', options: ["she is","is she","she was","was she"], answer_index: 1 },
    { level: 'med', prompt: 'Choose the best word: "The project was completed ___ schedule."', options: ["in","before","ahead of","prior"], answer_index: 2 },
    { level: 'med', prompt: 'Which sentence is grammatically correct?', options: ["Neither the teacher nor the students was ready.","Neither the teacher nor the students were ready.","Neither the teacher nor the students are ready.","Neither the teacher nor the students is ready."], answer_index: 1 },
    { level: 'med', prompt: 'Select the correct relative pronoun: "The book ___ I borrowed was fascinating."', options: ["who","whom","which","what"], answer_index: 2 },
    { level: 'hard', prompt: 'Choose the correct form: "Had I ___ about the meeting, I would have attended."', options: ["know","knew","known","knowing"], answer_index: 2 },
    { level: 'hard', prompt: 'Which sentence demonstrates correct parallel structure?', options: ["She likes swimming, to run, and cycling.","She likes swimming, running, and cycling.","She likes to swim, running, and to cycle.","She likes swim, run, and cycle."], answer_index: 1 },
    { level: 'hard', prompt: 'Fill in the blank: "The data ___ inconclusive at this stage."', options: ["are","is","were","has been"], answer_index: 0 },
    { level: 'hard', prompt: 'Choose the most appropriate word: "The committee reached a ___ decision after lengthy deliberation."', options: ["anonymous","unanimous","ambiguous","simultaneous"], answer_index: 1 },
    { level: 'hard', prompt: 'Which sentence correctly uses the subjunctive mood?', options: ["I suggest that he goes to the doctor.","I suggest that he go to the doctor.","I suggest that he went to the doctor.","I suggest that he will go to the doctor."], answer_index: 1 },
    { level: 'hard', prompt: 'Select the correct option: "___  the circumstances, we decided to postpone the event."', options: ["Giving","Given","Gave","Having gave"], answer_index: 1 },
    { level: 'hard', prompt: 'Choose the sentence with the correct use of a semicolon.', options: ["She was tired; and she went to bed early.","She was tired; she went to bed early.","She was tired; because she went to bed early.","She was tired; but she went to bed early."], answer_index: 1 },
    { level: 'hard', prompt: 'Fill in the blank: "The phenomenon, ___ had been observed previously, warranted further investigation."', options: ["that","who","which","what"], answer_index: 2 },
    { level: 'hard', prompt: 'Which word best completes: "The evidence is largely ___, making it difficult to draw definitive conclusions."', options: ["anecdotal","antidotal","ancestral","analytical"], answer_index: 0 },
  ];
  const { error: e4 } = await supabase.from('quiz_questions').insert(quizzes);
  console.log(e4 ? `❌ Quiz Questions: ${e4.message}` : `✅ ${quizzes.length} quiz questions seeded`);

  console.log('\n🎉 Seeding complete! Refresh your app to see the content.');
}

seed();
